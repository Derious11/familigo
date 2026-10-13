import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9095') throw new Error('This test runs only against the isolated local emulators.');
const projectId = 'demo-familigo-redesign';
const require = createRequire(import.meta.url);
const admin = require('../functions/node_modules/firebase-admin');
admin.initializeApp({ projectId });
const store = admin.firestore();
await store.doc('badges/b1').set({ id: 'b1', name: 'First Challenge', icon: '🏆', description: 'Start a challenge' });
await fs.mkdir('.test-artifacts', { recursive: true });
await build({
    stdin: { contents: `export * from './src/services/authService'; export * from './src/services/familyService'; export * from './src/services/challengeService'; export * from './src/firebaseConfig';`, resolveDir: process.cwd(), sourcefile: 'journey-test.ts' },
    outfile: '.test-artifacts/journey-services.mjs', bundle: true, platform: 'node', format: 'esm', packages: 'external',
    define: { '__FIREBASE_CONFIG__': JSON.stringify({ apiKey: 'demo-emulator-key', projectId, authDomain: 'localhost', storageBucket: `${projectId}.appspot.com`, appId: projectId, messagingSenderId: '000000000000' }), 'import.meta.env.MODE': '"emulator"', 'import.meta.env.VITE_FIREBASE_VAPID_KEY': '""' },
});
const services = await import(pathToFileURL(`${process.cwd()}/.test-artifacts/journey-services.mjs`).href);
const { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } = await import('firebase/firestore');
const { signOut } = await import('firebase/auth');
let completed = 0;
const pass = message => { completed++; console.log(`PASS: ${message}`); };

try {
    const signup = await services.signUpWithEmail('Test Parent', `redesign-${Date.now()}@example.test`, 'Synthetic-Test-Only-42!', 'adult', undefined, { kidCount: 1, kidAges: '9' });
    assert.equal(signup.error, null);
    assert.equal(signup.user.status, 'pending_approval');
    const parent = signup.user;
    pass('parent signup creates an account pending approval');
    await assert.rejects(services.createFamilyCircle(parent.id, 'Pending Test Family'));
    pass('pending accounts cannot create a family');
    await store.doc(`users/${parent.id}`).update({ status: 'active', email: null, approvedBy: 'emulator-fixture-admin' });
    const circle = await services.createFamilyCircle(parent.id, 'Redesign Test Family');
    const userDoc = await getDoc(doc(services.db, 'users', parent.id));
    assert.equal(userDoc.data().familyCircleId, circle.id);
    assert.deepEqual((await store.doc(`familyCircles/${circle.id}`).get()).data().adminIds, [parent.id]);
    pass('approved parent creates and joins their own family atomically');

    await store.doc('familyCircles/unrelated-fixture').set({ name: 'Unrelated Test', memberIds: ['someone-else'], members: { 'someone-else': true }, adminIds: ['someone-else'], betaApproved: true });
    await assert.rejects(updateDoc(doc(services.db, 'users', parent.id), { familyCircleId: 'unrelated-fixture' }));
    await assert.rejects(updateDoc(doc(services.db, 'users', parent.id), { role: 'admin', status: 'active' }));
    pass('family reassignment and role escalation remain denied');

    const parentUser = { ...parent, ...userDoc.data(), id: parent.id };
    const exercises = await services.getExercises();
    const exercise = exercises.find(item => item.name === 'Squats');
    assert.ok(exercise);
    await services.addChallengeToFamily(parentUser, circle.id, exercise, '5 Reps');
    const challenges = await getDocs(query(collection(services.db, 'challenges'), where('familyCircleId', '==', circle.id)));
    assert.equal(challenges.size, 1);
    const challenge = challenges.docs[0];
    pass('first solo challenge is created using the real service');
    const receiptRef=store.doc(`achievementEvents/create_${challenge.id}`);
    const deadline=Date.now()+15000;
    while (!(await receiptRef.get()).data()?.processedAt && Date.now()<deadline) {
        await new Promise(resolve=>setTimeout(resolve,200));
    }
    assert.ok((await receiptRef.get()).data()?.processedAt);
    const achievement=(await store.doc(`achievementProfiles/${parent.id}`).get()).data();
    assert.ok(achievement.state.awards.game_on);
    assert.equal(achievement.state.metrics.created,1);
    pass('real Firestore trigger processes the durable creation job and awards Game On');
    await services.addReplyToChallenge(parentUser, challenge.id, circle.id, undefined, 'Completed the challenge!', undefined, true);
    const completedChallenge = await getDoc(doc(services.db, 'challenges', challenge.id));
    assert.ok(completedChallenge.data().completedBy.includes(parent.id));
    const updatedUser = (await getDoc(doc(services.db, 'users', parent.id))).data();
    assert.ok(updatedUser.xp >= 10);
    assert.ok(Object.values(updatedUser.activityMap).some(value => value > 0));
    pass('challenge completion updates participation, XP, and calendar activity');

    await services.addChallengeToFamily(parentUser, circle.id, exercise, '20 Reps in 3 days', undefined, 'team', 20, 'Reps', 3);
    const teams = await getDocs(query(collection(services.db, 'challenges'), where('familyCircleId', '==', circle.id), where('type', '==', 'team')));
    const team = teams.docs[0];
    await services.addReplyToChallenge(parentUser, team.id, circle.id, undefined, 'Logged 5 Reps', undefined, true, 5);
    assert.equal((await getDoc(doc(services.db, 'challenges', team.id))).data().currentTotal, 5);
    pass('team contribution uses the same completed activity flow');

    await signOut(services.auth);
    const again = await services.signInWithEmail(parent.email, 'Synthetic-Test-Only-42!');
    assert.equal(again.error, null);
    pass('the parent can log in again after setup and completion');
    const second = await services.signUpWithEmail('Second Test Parent', `other-${Date.now()}@example.test`, 'Synthetic-Test-Only-42!', 'adult');
    assert.equal(second.error, null);
    await store.doc(`users/${second.user.id}`).update({ status: 'active', email: null });
    await assert.rejects(getDoc(doc(services.db, 'challenges', challenge.id)));
    pass('a signed-in user outside the family cannot read its challenges');
    await assert.rejects(updateDoc(doc(services.db, 'users', second.user.id), { familyCircleId: 'unrelated-fixture' }));
    for (const variant of ['extra-admin', 'beta-bypass', 'role-change']) {
        const circleRef = doc(collection(services.db, 'familyCircles'));
        const batch = writeBatch(services.db);
        batch.set(circleRef, { name: 'Denied Test', adminIds: variant === 'extra-admin' ? [second.user.id, parent.id] : [second.user.id], memberIds: [second.user.id], members: { [second.user.id]: true }, betaApproved: variant === 'beta-bypass' });
        batch.update(doc(services.db, 'users', second.user.id), { familyCircleId: circleRef.id, ...(variant === 'role-change' ? { role: 'teen' } : {}) });
        await assert.rejects(batch.commit());
        assert.equal((await store.doc(`familyCircles/${circleRef.id}`).get()).exists, false);
    }
    pass('bootstrap denies existing circles, extra admins, beta self-approval, and concurrent role changes atomically');
    console.log(`Journey verification complete: ${completed} checks; trusted activity callables used against the demo project only.`);
} finally {
    await signOut(services.auth);
    await admin.app().delete();
    process.exit(completed === 11 ? 0 : 1);
}
