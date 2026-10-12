export function challengeHasCompletion(challenge) {
    return challenge.type === 'team'
        ? challenge.goalTotal > 0 && challenge.currentTotal >= challenge.goalTotal
        : (challenge.completedBy || []).length > 0;
}

export function getInviteProgress(invite, users, families, challenges) {
    const user = invite.claimedBy
        ? users.find(user => user.id === invite.claimedBy)
        : users.find(user => user.email?.trim().toLowerCase() === invite.email.toLowerCase());
    const family = invite.claimedBy && user
        ? families.find(family => family.id === user.familyCircleId && family.adminIds[0] === user.id)
        : undefined;
    const joined = !!family && family.memberIds.length > 1;
    const completed = joined && challenges.some(challenge => challenge.familyCircleId === family.id && challengeHasCompletion(challenge));
    return { signedUp: !!user, circleCreated: !!family, memberAdded: joined, challengeCompleted: completed };
}

export function lastRecordedActivity(user) {
    const dates = [user.lastActiveDate?.getTime() || 0];
    for (const [day, count] of Object.entries(user.activityMap || {})) {
        if (count > 0) dates.push(Date.parse(`${day}T00:00:00Z`));
    }
    const timestamp = Math.max(0, ...dates.filter(date => Number.isFinite(date) && date <= Date.now()));
    return timestamp ? new Date(timestamp) : undefined;
}
