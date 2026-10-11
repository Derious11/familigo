const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
process.env.GCLOUD_PROJECT = 'familigo-dev-11643';
const { db } = require('../lib/init');
const { Resend } = require('resend');
const { sendTeenInviteEmail } = require('../lib/callables/email');
const { redeemTeenInvite } = require('../lib/callables/redeemTeenInvite');
const { validateTeenInvite } = require('../lib/callables/validateTeenInvite');
const { joinFamily } = require('../lib/callables/joinFamily');

// Exercise real callable handlers against an in-memory transaction adapter.
// This checks authorization and outcomes, not Firestore's own concurrency engine.
let documents, sent, deliveryFails;
const snapshot = path => ({ id: path.split('/').pop(), exists: documents.has(path), data: () => documents.get(path) });
const ref = path => ({ path, id: path.split('/').pop(), get: async () => snapshot(path) });
db.collection = name => ({
  doc: id => ref(`${name}/${id}`),
  where: (field, _operator, value) => ({ limit: () => ({ get: async () => {
    const docs = [...documents].filter(([path, data]) => path.startsWith(`${name}/`) && data[field] === value)
      .map(([path]) => ({ ...snapshot(path), ref: ref(path) })).slice(0, 1);
    return { empty: docs.length === 0, docs };
  } }) }),
});
db.runTransaction = async fn => {
  const writes = [];
  const result = await fn({
    get: async target => snapshot(target.path),
    create: (target, data) => writes.push(() => documents.set(target.path, data)),
    update: (target, changes) => writes.push(() => {
      const value = { ...documents.get(target.path) };
      for (const [field, change] of Object.entries(changes)) {
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          value[parent] = { ...value[parent], [child]: change };
        } else if (change?.constructor?.name === 'ArrayUnionTransform') {
          value[field] = [...new Set([...(value[field] || []), ...change.elements])];
        } else value[field] = change;
      }
      documents.set(target.path, value);
    }),
  });
  writes.forEach(write => write());
  return result;
};
new Resend('fixture').emails.constructor.prototype.send = async payload => {
  sent.push(payload);
  return deliveryFails ? { error: { name: 'delivery_failed' } } : { data: { id: 'test-email' } };
};
process.env.RESEND_API_KEY = 'fixture';
const adminContext = { auth: { uid: 'admin', token: { email: 'admin@example.test' } } };
const send = email => sendTeenInviteEmail.run({ email, teenName: 'Teen', familyCircleId: 'circle' }, adminContext);
const inviteCode = () => sent.at(-1).template.variables.inviteLink.split('code=')[1];
const teenContext = email => ({ auth: { uid: 'teen', token: { email } } });
beforeEach(() => {
  documents = new Map([
    ['familyCircles/circle', { name: 'Family', adminIds: ['admin'], memberIds: ['admin'] }],
    ['users/admin', { name: 'Parent', status: 'active', role: 'adult' }],
    ['users/teen', { role: 'teen', status: 'pending_approval' }],
  ]);
  sent = []; deliveryFails = false;
});
test('only a current approved circle admin can send', async () => {
  await assert.rejects(sendTeenInviteEmail.run({ email: 'teen@example.test', teenName: 'Teen', familyCircleId: 'circle' }, teenContext('teen@example.test')), { code: 'permission-denied' });
  documents.get('users/admin').status = 'pending_approval';
  await assert.rejects(send('teen@example.test'), { code: 'permission-denied' });
  assert.equal(sent.length, 0);
});
test('five recipients accepted, sixth blocked, normalized resend reuses slot', async () => {
  for (let i = 0; i < 5; i++) await send(`teen${i}@example.test`);
  await assert.rejects(send('sixth@example.test'), { code: 'resource-exhausted' });
  const firstCode = sent[0].template.variables.inviteLink;
  await send(' TEEN0@example.test ');
  assert.equal(sent.at(-1).template.variables.inviteLink, firstCode);
  assert.equal(documents.get('familyCircles/circle').inviteCount, 5);
});
test('failed delivery retry uses the existing reservation', async () => {
  deliveryFails = true;
  await assert.rejects(send('teen@example.test'), { code: 'internal' });
  const code = inviteCode();
  deliveryFails = false;
  await send('teen@example.test');
  assert.equal(inviteCode(), code);
  assert.equal(documents.get('familyCircles/circle').inviteCount, 1);
});
test('valid recipient is activated once and linked atomically', async () => {
  await send('teen@example.test');
  const code = inviteCode();
  assert.equal((await validateTeenInvite.run({ code }, {})).familyCircleId, 'circle');
  await assert.rejects(redeemTeenInvite.run({ inviteCode: code }, teenContext('wrong@example.test')), { code: 'permission-denied' });
  assert.equal(documents.get('users/teen').status, 'pending_approval');
  await redeemTeenInvite.run({ inviteCode: code }, teenContext('teen@example.test'));
  assert.equal(documents.get('users/teen').status, 'active');
  assert.equal(documents.get('users/teen').approvedBy, 'admin');
  assert.equal(documents.get('users/teen').familyCircleId, 'circle');
  assert.ok(documents.get('familyCircles/circle').memberIds.includes('teen'));
  assert.equal((await redeemTeenInvite.run({ inviteCode: code }, teenContext('teen@example.test'))).alreadyMember, true);
  await assert.rejects(validateTeenInvite.run({ code }, {}), { code: 'not-found' });
});
test('revoked admin and legacy shared codes cannot activate accounts', async () => {
  await send('teen@example.test');
  const code = inviteCode();
  documents.get('familyCircles/circle').adminIds = [];
  await assert.rejects(redeemTeenInvite.run({ inviteCode: code }, teenContext('teen@example.test')), { code: 'permission-denied' });
  await assert.rejects(redeemTeenInvite.run({ inviteCode: 'OLD-1234' }, teenContext('teen@example.test')), { code: 'not-found' });
  assert.equal(documents.get('users/teen').status, 'pending_approval');
});
test('existing teen members count toward the five-invitation quota', async () => {
  documents.get('familyCircles/circle').memberIds.push('teen');
  for (let i = 0; i < 4; i++) await send(`new${i}@example.test`);
  await assert.rejects(send('sixth@example.test'), { code: 'resource-exhausted' });
});
test('adult joins activate the account and share the circle invitation quota', async () => {
  documents.get('familyCircles/circle').inviteCode = 'FAMILY-CODE';
  documents.set('users/adult', { role: 'adult', status: 'pending_approval' });
  const context = { auth: { uid: 'adult', token: {} } };
  for (let i = 0; i < 4; i++) await send(`invite${i}@example.test`);
  await joinFamily.run({ inviteCode: 'FAMILY-CODE' }, context);
  assert.equal(documents.get('users/adult').status, 'active');
  assert.equal(documents.get('familyCircles/circle').inviteCount, 5);
  assert.equal((await joinFamily.run({ inviteCode: 'FAMILY-CODE' }, context)).alreadyMember, true);
  await assert.rejects(send('sixth@example.test'), { code: 'resource-exhausted' });
});
