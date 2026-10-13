const assert = require('node:assert/strict');
const {test} = require('node:test');
const {FieldPath, FieldValue} = require('firebase-admin/firestore');
const queries = [];
const removals = [];
let sends = 0;
const initPath = require.resolve('../lib/init');
require.cache[initPath] = {id: initPath, filename: initPath, loaded: true, exports: {
  db: {collection: () => ({
    where: (field, operator, ids) => {
      assert.ok(field.isEqual(FieldPath.documentId()));
      assert.equal(operator, 'in');
      queries.push(ids);
      return {get: async () => ({forEach: callback => ids.forEach(id => callback({id, data: () => ({notificationTokens: [`token-${id}`, 'shared-token']})}))})};
    },
    doc: id => ({update: async data => removals.push({id, value: data.notificationTokens})}),
  })},
  messaging: {sendEachForMulticast: async payload => {sends++; return {responses: payload.tokens.map((_, index) => index === 0 ? {success: false, error: {code: 'messaging/registration-token-not-registered'}} : {success: true})};}},
}};
const {getTokensForUsers, sendNotifications} = require('../lib/utils/notifications');
test('token lookup uses supported FieldPath, chunks at 30, and deduplicates users and tokens', async () => {
  const ids = Array.from({length: 35}, (_, index) => `demo-${index}`);
  const records = await getTokensForUsers([...ids, ids[0]]);
  assert.deepEqual(queries.map(ids => ids.length), [30, 5]);
  assert.equal(records.length, 36);
  assert.equal(records.filter(row => row.token === 'shared-token').length, 1);
});
test('invalid registration tokens are removed with supported FieldValue', async () => {
  await sendNotifications([{userId: 'demo-0', token: 'invalid-demo-token'}, {userId: 'demo-1', token: 'valid-demo-token'}], tokens => ({tokens}), 'test');
  assert.equal(sends, 1);
  assert.equal(removals.length, 1);
  assert.equal(removals[0].id, 'demo-0');
  assert.ok(removals[0].value.isEqual(FieldValue.arrayRemove('invalid-demo-token')));
});
test('empty recipient lists do not query or send notifications', async () => {
  const queryCount = queries.length;
  assert.deepEqual(await getTokensForUsers([]), []);
  await sendNotifications([], () => {throw new Error('No payload expected');}, 'test');
  assert.equal(queries.length, queryCount);
  assert.equal(sends, 1);
});
