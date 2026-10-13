// Operational migration using existing IAM credentials. No user impersonation.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
if (args[args.indexOf('--project') + 1] !== 'familigo-11643' || args.indexOf('--project') < 0) throw new Error('Explicit production project required.');
if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Production migration cannot use emulator overrides.');
const apply = args.includes('--apply');
process.env.GCLOUD_PROJECT = 'familigo-11643';
const admin = require('../functions/node_modules/firebase-admin');
admin.initializeApp({projectId: 'familigo-11643', credential: admin.credential.applicationDefault()});
let {db} = require('../functions/lib/init');
const cliIndex = args.indexOf('--firebase-cli');
if (cliIndex >= 0) {
  // Reuse the already-authorized Firebase CLI account in memory. Never export
  // credentials into arguments, browser code, source files or logs.
  const cliRequire = createRequire(new URL('../package.json', import.meta.url));
  const cliAuth = cliRequire(`${args[cliIndex + 1]}/lib/auth.js`);
  const account = cliAuth.getProjectDefaultAccount(process.cwd());
  if (!account?.tokens?.refresh_token) throw new Error('An authenticated Firebase CLI account is required.');
  const cliApi = cliRequire(`${args[cliIndex + 1]}/lib/api.js`);
  const {GoogleAuth} = require('../functions/node_modules/google-auth-library');
  const {Firestore} = require('../functions/node_modules/@google-cloud/firestore');
  const auth = new GoogleAuth({credentials: {type: 'authorized_user', client_id: cliApi.clientId(), client_secret: cliApi.clientSecret(), refresh_token: account.tokens.refresh_token}, scopes: ['https://www.googleapis.com/auth/cloud-platform']});
  db = new Firestore({projectId: 'familigo-11643', auth});
}
const {reconcileFamilyAchievements} = require('../functions/lib/achievements/reconcile');
try {
  const families = await db.collection('familyCircles').select('memberIds', 'members').get();
  const preview = [];
  // Preview every circle before applying any writes; limits fail closed.
  for (const family of families.docs) preview.push({id: family.id, result: await reconcileFamilyAchievements(family.id, false, db)});
  const summarize = rows => ({families: rows.length, members: rows.reduce((sum, row) => sum + row.result.members, 0), newAwards: rows.reduce((sum, row) => sum + row.result.newAwards, 0), skippedCompletionDates: rows.reduce((sum, row) => sum + row.result.skippedCompletionDates, 0)});
  console.log(JSON.stringify({mode: 'preview', ...summarize(preview)}));
  if (apply) {
    const backup = {project: 'familigo-11643', capturedAt: new Date().toISOString(), profiles: {}, familyAchievements: {}, counts: {}};
    for (const family of families.docs) {
      const familyAward = await db.doc(`familyAchievements/${family.id}`).get();
      backup.familyAchievements[family.id] = familyAward.exists ? familyAward.data() : null;
      for (const id of family.data().memberIds || []) {
        const [profile, user] = await Promise.all([db.doc(`achievementProfiles/${id}`).get(), db.doc(`users/${id}`).get()]);
        backup.profiles[id] = profile.exists ? profile.data() : null;
        backup.counts[id] = user.data()?.achievementCount ?? null;
      }
    }
    await fs.mkdir('.test-artifacts', {recursive: true});
    // Ignored local recovery data; never print family or user contents.
    await fs.writeFile(`.test-artifacts/achievement-backfill-backup-${Date.now()}.json`, JSON.stringify(backup));
    const results = [];
    for (const {id} of preview) results.push({id, result: await reconcileFamilyAchievements(id, true, db)});
    console.log(JSON.stringify({mode: 'applied', ...summarize(results)}));
    const remaining = [];
    for (const {id} of preview) remaining.push({id, result: await reconcileFamilyAchievements(id, false, db)});
    const verification = summarize(remaining);
    if (verification.newAwards !== 0) throw new Error('Backfill verification found unapplied awards.');
    console.log(JSON.stringify({mode: 'verified', ...verification}));
  }
} finally { await admin.app().delete(); }
