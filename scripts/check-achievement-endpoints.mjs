// Read-only smoke check: unauthenticated calls cannot record any activity.
import assert from 'node:assert/strict';

const projectIndex = process.argv.indexOf('--project');
const project = projectIndex < 0 ? 'familigo-dev-11643' : process.argv[projectIndex + 1];
assert.ok(['familigo-dev-11643', 'familigo-11643'].includes(project), 'Choose an explicit FamiliGo project.');
const origin = project === 'familigo-11643' ? 'https://www.familigo.life' : 'http://localhost:3000';
const base = `https://us-central1-${project}.cloudfunctions.net`;
const names = ['recordChallenge', 'recordChallengeReply', 'recordChallengeReaction', 'updateAchievementProfile', 'reconcileAchievements'];
for (const name of names) {
    const endpoint = `${base}/${name}`;
    const preflight = await fetch(endpoint, {
        method: 'OPTIONS',
        headers: {
            Origin: origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'authorization,content-type',
        },
        signal: AbortSignal.timeout(30000),
    });
    assert.ok(preflight.ok, `${name}: preflight HTTP ${preflight.status}`);
    const allowed = preflight.headers.get('access-control-allow-origin');
    assert.ok(allowed === origin || allowed === '*', `${name}: localhost origin not allowed`);
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {Origin: origin, 'Content-Type': 'application/json'},
        body: JSON.stringify({data: {
            actorId: 'endpoint-check', familyCircleId: 'endpoint-check',
            requestId: 'endpoint-check', challengeId: 'endpoint-check',
            replyId: 'endpoint-check', emoji: '👏',
        }}),
        signal: AbortSignal.timeout(30000),
    });
    assert.equal(response.status, 401, `${name}: unauthenticated request must be denied`);
    assert.equal((await response.json()).error?.status, 'UNAUTHENTICATED');
    console.log(`PASS: ${name} accepts ${origin} CORS and requires authentication.`);
}
