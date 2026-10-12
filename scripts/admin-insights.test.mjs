import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getInviteProgress, challengeHasCompletion, lastRecordedActivity } from '../src/lib/adminInsights.mjs';

const invite = { email: 'parent@example.test', claimedBy: 'parent' };
const users = [{ id: 'parent', email: 'parent@example.test', familyCircleId: 'circle' }];
const family = { id: 'circle', adminIds: ['parent'], memberIds: ['parent', 'child'] };

test('the funnel follows the invited creator and ignores unrelated family challenges', () => {
    assert.deepEqual(getInviteProgress(invite, users, [family], [{ familyCircleId: 'other', completedBy: ['child'] }]), {
        signedUp: true, circleCreated: true, memberAdded: true, challengeCompleted: false,
    });
    assert.equal(getInviteProgress(invite, users, [family], [{ familyCircleId: 'circle', completedBy: ['child'] }]).challengeCompleted, true);
});
test('joining another family does not count as creating a new circle', () => {
    const joined = { ...family, adminIds: ['other', 'parent'] };
    assert.equal(getInviteProgress(invite, users, [joined], []).circleCreated, false);
});
test('unredeemed recipient accounts count as signed up but not as circles created', () => {
    assert.deepEqual(getInviteProgress({ email: 'PARENT@example.test' }, users, [family], []), {
        signedUp: true, circleCreated: false, memberAdded: false, challengeCompleted: false,
    });
});
test('a solo creator has not yet reached the family participation stages', () => {
    const solo = { ...family, memberIds: ['parent'] };
    const progress = getInviteProgress(invite, users, [solo], [{ familyCircleId: 'circle', completedBy: ['parent'] }]);
    assert.equal(progress.memberAdded, false);
    assert.equal(progress.challengeCompleted, false);
});
test('team contributions only count as completion when the goal is reached', () => {
    assert.equal(challengeHasCompletion({ type: 'team', completedBy: ['parent'], currentTotal: 2, goalTotal: 10 }), false);
    assert.equal(challengeHasCompletion({ type: 'team', currentTotal: 10, goalTotal: 10 }), true);
    assert.equal(challengeHasCompletion({ type: 'team', currentTotal: 0, goalTotal: 0 }), false);
});
test('recorded activity ignores future dates, invalid dates and empty entries', () => {
    assert.equal(lastRecordedActivity({ activityMap: { '2099-01-01': 10, bad: 1, '2026-01-01': 0 } }), undefined);
    assert.equal(lastRecordedActivity({ lastActiveDate: new Date('2025-01-01'), activityMap: { '2026-01-01': 1 } }).toISOString(), '2026-01-01T00:00:00.000Z');
});
