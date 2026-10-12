const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
process.env.GCLOUD_PROJECT = 'familigo-dev-11643';
process.env.RESEND_API_KEY = 'fixture';
const { db } = require('../lib/init');
const { Resend } = require('resend');
const { sendAccessInvite, redeemAccessInvite } = require('../lib/callables/accessInvites');
const { approveWaitlistUsers, revokeAccessInvite, updateAdminFeedback } = require('../lib/callables/admin');

// Run the real callable handlers with an in-memory transaction adapter.
let documents, sent, deliveryFails;
const email = 'parent@example.test';
const invitePath = `accessInvites/${createHash('sha256').update(email).digest('hex')}`;
const snapshot = path => ({ exists: documents.has(path), data: () => documents.get(path) });
const reference = path => ({ path, id: path.split('/').pop(), update: async data => documents.set(path, { ...documents.get(path), ...data }) });
db.collection = name => ({ doc: (id = randomUUID()) => reference(`${name}/${id}`) });
db.runTransaction = async callback => {
    const writes = [];
    const result = await callback({
        get: async ref => snapshot(ref.path),
        set: (ref, data) => writes.push(() => documents.set(ref.path, data)),
        update: (ref, data) => writes.push(() => documents.set(ref.path, { ...documents.get(ref.path), ...data })),
    });
    writes.forEach(write => write());
    return result;
};
new Resend('fixture').emails.constructor.prototype.send = async (payload, options) => {
    sent.push({ payload, options });
    return deliveryFails ? { error: { name: 'test-failure' } } : { data: { id: 'test-message' } };
};
const adminContext = { auth: { uid: 'admin', token: { admin: true } } };
const parentContext = { auth: { uid: 'parent', token: { email, email_verified: true } } };
const send = () => sendAccessInvite.run({ email }, adminContext);
const claim = context => redeemAccessInvite.run({ code: documents.get(invitePath).code }, context || parentContext);
beforeEach(() => {
    documents = new Map([['users/parent', { role: 'adult', status: 'pending_approval' }]]);
    sent = [];
    deliveryFails = false;
});

test('only authenticated global admins can send invitations', async () => {
    await assert.rejects(sendAccessInvite.run({ email }, {}), { code: 'unauthenticated' });
    await assert.rejects(sendAccessInvite.run({ email }, parentContext), { code: 'permission-denied' });
    await assert.rejects(sendAccessInvite.run({ email: 'invalid' }, adminContext), { code: 'invalid-argument' });
    assert.equal(sent.length, 0);
});

test('delivery failures and retries retain the code and idempotency key', async () => {
    deliveryFails = true;
    await assert.rejects(send(), { code: 'internal' });
    const code = documents.get(invitePath).code;
    assert.equal(documents.get(invitePath).deliveryStatus, 'failed');
    deliveryFails = false;
    await sendAccessInvite.run({ email: ' PARENT@example.test ' }, adminContext);
    assert.equal(documents.get(invitePath).code, code);
    assert.equal(sent[0].options.idempotencyKey, sent[1].options.idempotencyKey);
    assert.equal(documents.get(invitePath).deliveryStatus, 'sent');
    assert.ok(sent[1].payload.text.includes('https://familigo-dev-11643.web.app/early-access'));
});

test('redemption requires the matching authenticated recipient email and correct code', async () => {
    await send();
    await assert.rejects(redeemAccessInvite.run({ code: documents.get(invitePath).code }, {}), { code: 'unauthenticated' });
    await assert.rejects(claim({ auth: { uid: 'other', token: { email: 'other@example.test', email_verified: true } } }), { code: 'not-found' });
    await assert.rejects(redeemAccessInvite.run({ code: 'A'.repeat(24) }, parentContext), { code: 'not-found' });
    assert.equal(documents.get('users/parent').status, 'pending_approval');
});

test('signup redemption pre-approves family creation without a separate approval step', async () => {
    await send();
    await claim({ auth: { uid: 'parent', token: { email, email_verified: false } } });
    await claim();
    assert.equal(documents.get('users/parent').status, 'active');
    assert.equal(documents.get('users/parent').approvedBy, 'admin');
    assert.equal(documents.get('users/parent').familyCreationApproved, true);
    assert.equal(documents.get(invitePath).claimedBy, 'parent');
    await assert.rejects(send(), { code: 'already-exists' });
});

test('a first-member invite cannot approve an account already in a family', async () => {
    await send();
    documents.get('users/parent').familyCircleId = 'existing-circle';
    await assert.rejects(claim(), { code: 'failed-precondition' });
    assert.equal(documents.get('users/parent').status, 'pending_approval');
    assert.equal(documents.get(invitePath).claimedBy, undefined);
});

test('expired invites cannot activate accounts and are replaced on a new send', async () => {
    await send();
    const code = documents.get(invitePath).code;
    documents.get(invitePath).expiresAt = { toMillis: () => Date.now() - 1 };
    await assert.rejects(claim(), { code: 'failed-precondition' });
    await send();
    assert.notEqual(documents.get(invitePath).code, code);
    await assert.rejects(redeemAccessInvite.run({ code }, parentContext), { code: 'not-found' });
});

test('teen and suspended accounts cannot gain access through a parent invite', async () => {
    await send();
    documents.set('users/parent', { role: 'teen', status: 'pending_approval' });
    await assert.rejects(claim(), { code: 'failed-precondition' });
    documents.set('users/parent', { role: 'adult', status: 'suspended' });
    await assert.rejects(claim(), { code: 'failed-precondition' });
    assert.equal(documents.get(invitePath).claimedBy, undefined);
});

test('revoked invitations stop redemption and reissue creates a new code', async () => {
    await send();
    const code = documents.get(invitePath).code;
    await revokeAccessInvite.run({ inviteId: invitePath.split('/')[1] }, adminContext);
    await assert.rejects(claim(), { code: 'failed-precondition' });
    assert.equal(documents.get('users/parent').status, 'pending_approval');
    await send();
    assert.notEqual(documents.get(invitePath).code, code);
    assert.equal(documents.get(invitePath).revokedAt, undefined);
    await assert.rejects(redeemAccessInvite.run({ code }, parentContext), { code: 'not-found' });
    await claim();
    await assert.rejects(revokeAccessInvite.run({ inviteId: invitePath.split('/')[1] }, adminContext), { code: 'failed-precondition' });
});

test('explicit resends use a new delivery key and a failed resend retry retains it', async () => {
    await send();
    const code = documents.get(invitePath).code;
    const initialKey = sent[0].options.idempotencyKey;
    deliveryFails = true;
    await assert.rejects(sendAccessInvite.run({ email, resend: true }, adminContext), { code: 'internal' });
    const resendKey = sent[1].options.idempotencyKey;
    assert.notEqual(initialKey, resendKey);
    deliveryFails = false;
    await sendAccessInvite.run({ email, resend: true }, adminContext);
    assert.equal(sent[2].options.idempotencyKey, resendKey);
    assert.equal(documents.get(invitePath).code, code);
});

test('all management mutations require the app admin claim', async () => {
    for (const [handler, data] of [[approveWaitlistUsers, { userIds: ['parent'] }], [revokeAccessInvite, { inviteId: 'invite' }], [updateAdminFeedback, { feedbackId: 'feedback', status: 'new', internalNotes: '' }]]) {
        await assert.rejects(handler.run(data, {}), { code: 'unauthenticated' });
        await assert.rejects(handler.run(data, parentContext), { code: 'permission-denied' });
    }
});

test('bulk approvals deduplicate IDs and skip accounts no longer awaiting approval', async () => {
    documents.set('users/active', { status: 'active' });
    documents.set('users/suspended', { status: 'suspended' });
    const result = await approveWaitlistUsers.run({ userIds: ['parent', 'parent', 'active', 'suspended', 'missing'] }, adminContext);
    assert.deepEqual(result.approved, ['parent']);
    assert.deepEqual(result.skipped, ['active', 'suspended', 'missing']);
    assert.equal(documents.get('users/parent').approvedBy, 'admin');
    assert.equal(documents.get('users/suspended').status, 'suspended');
    const events = [...documents].filter(([path]) => path.startsWith('adminAudit/')).map(([, event]) => event);
    assert.equal(events.length, 1);
    assert.equal(events[0].action, 'account_approved');
    assert.equal(events[0].actorId, 'admin');
});

test('bulk approvals reject invalid selections before changing data', async () => {
    for (const userIds of [[], Array(51).fill('parent'), ['users/parent'], ['']]) {
        await assert.rejects(approveWaitlistUsers.run({ userIds }, adminContext), { code: 'invalid-argument' });
    }
    assert.equal(documents.get('users/parent').status, 'pending_approval');
});

test('feedback notes are saved separately and note contents stay out of audit events', async () => {
    documents.set('feedback/issue', { issue: 'Original feedback', userId: 'parent' });
    await updateAdminFeedback.run({ feedbackId: 'issue', status: 'investigating', internalNotes: ' Private investigation notes ' }, adminContext);
    assert.equal(documents.get('feedback/issue').internalNotes, undefined);
    assert.equal(documents.get('adminFeedback/issue').internalNotes, 'Private investigation notes');
    assert.equal(documents.get('adminFeedback/issue').status, 'investigating');
    const events = [...documents].filter(([path]) => path.startsWith('adminAudit/')).map(([, event]) => event);
    assert.equal(events[0].action, 'feedback_updated');
    assert.deepEqual(events[0].details, { status: 'investigating' });
    await assert.rejects(updateAdminFeedback.run({ feedbackId: 'missing', status: 'new', internalNotes: '' }, adminContext), { code: 'not-found' });
    await assert.rejects(updateAdminFeedback.run({ feedbackId: 'issue', status: 'invalid', internalNotes: '' }, adminContext), { code: 'invalid-argument' });
    await assert.rejects(updateAdminFeedback.run({ feedbackId: 'issue', status: 'new', internalNotes: 'x'.repeat(5001) }, adminContext), { code: 'invalid-argument' });
});

test('invitation audit events omit bearer codes', async () => {
    await send(); await claim();
    const code = documents.get(invitePath).code;
    const events = [...documents].filter(([path]) => path.startsWith('adminAudit/')).map(([, event]) => event);
    assert.deepEqual(events.map(event => event.action), ['invite_created', 'invite_sent', 'invite_redeemed']);
    assert.equal(JSON.stringify(events).includes(code), false);
});
