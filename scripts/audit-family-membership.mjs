// Read-only production membership diagnostics. Never print credentials or profiles.
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const project = process.argv[2];
if (project !== 'familigo-11643' || process.env.FIRESTORE_EMULATOR_HOST) throw Error('Explicit production project required.');
const cli = require('../.local-tools/firebase-cli/node_modules/firebase-tools/lib/auth.js');
const api = require('../.local-tools/firebase-cli/node_modules/firebase-tools/lib/api.js');
const account = cli.getProjectDefaultAccount(process.cwd());
if (!account?.tokens?.refresh_token) throw Error('Existing Firebase CLI authentication required.');
const {GoogleAuth} = require('../functions/node_modules/google-auth-library');
const {Firestore} = require('../functions/node_modules/@google-cloud/firestore');
const auth = new GoogleAuth({credentials: {type: 'authorized_user', client_id: api.clientId(), client_secret: api.clientSecret(), refresh_token: account.tokens.refresh_token}, scopes: ['https://www.googleapis.com/auth/cloud-platform']});
const db = new Firestore({projectId: project, auth});
try {
  const families = await db.collection('familyCircles').select('memberIds', 'members').limit(101).get();
  if (families.size > 100) throw Error('Audit limit exceeded.');
  const counts = {families: families.size, members: 0, missingProfile: 0, wrongFamily: 0, disabledMembership: 0, inactiveStatus: 0, missingStatus: 0, invalidParent: 0};
  for (const familyDoc of families.docs) {
    const family = familyDoc.data();
    const ids = family.memberIds || [];
    if (ids.length > 100) throw Error('Member limit exceeded.');
    for (const id of ids) {
      counts.members++;
      const actor = (await db.doc(`users/${id}`).get()).data();
      if (!actor) { counts.missingProfile++; continue; }
      if (actor.familyCircleId !== familyDoc.id) counts.wrongFamily++;
      if (family.members?.[id] === false) counts.disabledMembership++;
      if (!(actor.status === 'active' || (actor.role === 'child' && !actor.status))) {
        counts.inactiveStatus++;
        if (!actor.status) counts.missingStatus++;
      }
      if (actor.role === 'child') {
        const parent = actor.parentId ? (await db.doc(`users/${actor.parentId}`).get()).data() : null;
        if (!parent || parent.status !== 'active' || parent.role !== 'adult' || parent.familyCircleId !== familyDoc.id || !ids.includes(actor.parentId) || family.members?.[actor.parentId] === false) counts.invalidParent++;
      }
    }
  }
  console.log(JSON.stringify({readOnly: true, ...counts}));
} finally { await db.terminate(); }
