// Narrow repair for a confirmed legacy member; preview unless --apply is supplied.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const [project, email, ...flags] = process.argv.slice(2);
if (project !== 'familigo-11643' || !email?.includes('@') || process.env.FIRESTORE_EMULATOR_HOST) throw Error('Explicit production project and account email required.');
const cli = require('../.local-tools/firebase-cli/node_modules/firebase-tools/lib/auth.js');
const api = require('../.local-tools/firebase-cli/node_modules/firebase-tools/lib/api.js');
const account = cli.getProjectDefaultAccount(process.cwd());
if (!account?.tokens?.refresh_token) throw Error('Existing Firebase CLI authentication required.');
const {GoogleAuth} = require('../functions/node_modules/google-auth-library');
const {Firestore} = require('../functions/node_modules/@google-cloud/firestore');
const auth = new GoogleAuth({credentials: {type: 'authorized_user', client_id: api.clientId(), client_secret: api.clientSecret(), refresh_token: account.tokens.refresh_token}, scopes: ['https://www.googleapis.com/auth/cloud-platform']});
const db = new Firestore({projectId: project, auth});
try {
  const matches = await db.collection('users').where('email', '==', email).limit(2).get();
  if (matches.size !== 1) throw Error('Expected exactly one matching profile.');
  const ref = matches.docs[0].ref;
  const initial = matches.docs[0].data();
  console.log(JSON.stringify({role: initial.role ?? null, status: initial.status ?? null, hasFamily: !!initial.familyCircleId}));
  const validate = async tx => {
    const snapshot = await tx.get(ref);
    const actor = snapshot.data();
    if (!actor || actor.email !== email || (Object.hasOwn(actor, 'role') && !['adult', 'teen'].includes(actor.role)) || actor.parentId || !actor.familyCircleId) throw Error('Not an eligible existing self-managed member.');
    if (Object.hasOwn(actor, 'status')) throw Error('Status is already explicit; refusing to override it.');
    const family = (await tx.get(db.doc(`familyCircles/${actor.familyCircleId}`))).data();
    if (!family?.memberIds?.includes(ref.id) || family.members?.[ref.id] === false) throw Error('Existing family membership is not valid.');
    return {snapshot, actor};
  };
  const preview = await db.runTransaction(validate);
  console.log(JSON.stringify({mode: 'preview', matchedProfiles: 1, missingStatus: true, validFamilyMembership: true, role: preview.actor.role, proposedStatus: 'active'}));
  if (flags.includes('--apply')) {
    await fs.mkdir('.test-artifacts', {recursive: true});
    await fs.writeFile(`.test-artifacts/membership-repair-${Date.now()}.json`, JSON.stringify({project, path: ref.path, previousStatusAbsent: true, updateTime: preview.snapshot.updateTime.toDate().toISOString(), newStatus: 'active'}), {flag: 'wx'});
    await db.runTransaction(async tx => {
      const current = await validate(tx);
      if (!current.snapshot.updateTime.isEqual(preview.snapshot.updateTime)) throw Error('Profile changed since preview; retry inspection.');
      tx.update(ref, {status: 'active'});
    });
    const actor = (await ref.get()).data();
    const family = (await db.doc(`familyCircles/${actor.familyCircleId}`).get()).data();
    const authorized = actor.status === 'active' && family?.memberIds?.includes(ref.id) && family.members?.[ref.id] !== false;
    if (!authorized) throw Error('Post-repair authorization verification failed.');
    console.log(JSON.stringify({mode: 'verified', updatedProfiles: 1, selfPostingMembershipCheck: 'passed'}));
  }
} finally { await db.terminate(); }
