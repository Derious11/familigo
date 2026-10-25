import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, Timestamp, serverTimestamp, terminate } from 'firebase/firestore';
import { getApps, deleteApp } from 'firebase/app';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { adventureWeek } from '../src/lib/adventure.mjs';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9095') throw new Error('Only run against isolated local emulators.');
const require = createRequire(import.meta.url);
const admin = require('../functions/node_modules/firebase-admin');
const projectId = 'demo-familigo-redesign';
admin.initializeApp({ projectId });
await fs.mkdir('.test-artifacts', { recursive: true });
await build({ stdin: { contents: "export * from './src/services/adventureService'; export * from './src/firebaseConfig';", resolveDir: process.cwd(), sourcefile: 'adventure-service-test.ts' }, outfile: '.test-artifacts/adventure-service.mjs', bundle: true, platform: 'node', format: 'esm', packages: 'external', define: { __FIREBASE_CONFIG__: JSON.stringify({ apiKey: 'demo-key', authDomain: 'localhost', projectId, storageBucket: `${projectId}.appspot.com`, appId: 'demo' }), 'import.meta.env.MODE': '"emulator"' } });
const services = await import(pathToFileURL(`${process.cwd()}/.test-artifacts/adventure-service.mjs`).href);
const store = admin.firestore();
const suffix = Date.now();
const familyId = `adventure-test-${suffix}`;
const users = ['parent', 'teen', 'child', 'outsider'].map(role => ({ id: `${role}-${suffix}`, email: `${role}-${suffix}@example.test`, password: `local-test-${suffix}` }));
for (const [index, user] of users.entries()) {
    await admin.auth().createUser({ uid: user.id, email: user.email, password: user.password });
    await store.doc(`users/${user.id}`).set({ name: user.id, role: index === 1 ? 'teen' : index === 2 ? 'child' : 'adult', status: 'active', familyCircleId: index === 3 ? `other-${suffix}` : familyId, activityMap: {} });
}
await store.doc(`familyCircles/${familyId}`).set({ memberIds: users.slice(0, 3).map(user => user.id), members: Object.fromEntries(users.slice(0, 3).map(user => [user.id, true])), adminIds: [users[0].id, users[1].id] });
const week = adventureWeek();
const ref = doc(services.db, 'familyCircles', familyId, 'weeklyAdventures', week.id);
const payload = () => ({ target: 60, trailTarget: 20, startsAt: Timestamp.fromDate(week.start), endsAt: Timestamp.fromDate(week.end), createdBy: users[0].id, createdAt: serverTimestamp() });
const login = index => signInWithEmailAndPassword(services.auth, users[index].email, users[index].password);
const denied = async operation => assert.rejects(operation, error => error.code === 'permission-denied');
try {
    await denied(() => getDoc(ref));
    await login(0);
    assert.equal((await getDoc(ref)).exists(), false);
    for (const changes of [{ target: 0 }, { target: 100001 }, { target: 7.5 }, { trailTarget: 99 }, { target: 61, trailTarget: 20 }, { createdBy: users[1].id }, { extra: true }, { createdAt: Timestamp.fromMillis(0) }, { endsAt: Timestamp.fromDate(new Date(+week.end + 86400000)) }]) await denied(() => setDoc(ref, { ...payload(), ...changes }));
    await denied(() => setDoc(doc(services.db, 'familyCircles', familyId, 'weeklyAdventures', 'wrong-id'), payload()));
    await denied(() => setDoc(ref, { ...payload(), startsAt: Timestamp.fromDate(new Date(+week.start - 7 * 86400000)), endsAt: Timestamp.fromDate(week.start) }));
    await denied(() => setDoc(ref, { ...payload(), startsAt: Timestamp.fromDate(new Date(+week.start + 86400000)), endsAt: Timestamp.fromDate(new Date(+week.end + 86400000)) }));
    // A cosmetic family preference may change without mutating the weekly goal.
    const familyRef = doc(services.db, 'familyCircles', familyId);
    for (const adventureTheme of ['mountain', 'forest', 'coast', 'canyon']) {
        await updateDoc(familyRef, { adventureTheme });
        assert.equal((await getDoc(familyRef)).data().adventureTheme, adventureTheme);
    }
    await denied(() => updateDoc(familyRef, { adventureTheme: 'untrusted-url' }));
    await denied(() => updateDoc(familyRef, { adventureTheme: 42 }));
    await login(1);
    await denied(() => setDoc(ref, { ...payload(), createdBy: users[1].id }));
    await login(2);
    await updateDoc(familyRef, { adventureTheme: 'coast' });
    await denied(() => setDoc(ref, { ...payload(), createdBy: users[2].id }));
    await login(3);
    await denied(() => updateDoc(familyRef, { adventureTheme: 'canyon' }));
    await denied(() => getDoc(ref));
    await denied(() => setDoc(ref, { ...payload(), createdBy: users[3].id }));
    await login(0);
    // Uneven goals must round the per-person milestone up on both client and server.
    const launches = await Promise.allSettled([services.startAdventure(familyId, week, 61, 3, users[0].id), services.startAdventure(familyId, week, 61, 3, users[0].id)]);
    assert.equal(launches.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal((await getDoc(ref)).data().target, 61);
    assert.equal((await getDoc(ref)).data().trailTarget, 21);
    await updateDoc(familyRef, { adventureTheme: 'forest' });
    assert.equal((await getDoc(ref)).data().target, 61);
    await assert.rejects(() => services.startAdventure(familyId, week, 90, 3, users[0].id), /already started/);
    await denied(() => updateDoc(ref, { target: 90, trailTarget: 30 }));
    await denied(() => deleteDoc(ref));
    await login(1);
    assert.equal((await getDoc(ref)).data().target, 61);
    await login(2);
    assert.equal((await getDoc(ref)).data().target, 61);
    await new Promise((resolve, reject) => {
        let updateRequested = false;
        const timeout = setTimeout(() => { unsubscribe(); reject(new Error('Live activity update timed out.')); }, 10000);
        const unsubscribe = services.watchLeaderboardMembers(users.slice(0, 3).map(user => user.id), members => {
            try {
                assert.equal(members.length, 3);
                if (members.find(member => member.id === users[0].id)?.activityMap?.[week.id] === 4) { clearTimeout(timeout); unsubscribe(); resolve(); }
                else if (!updateRequested) { updateRequested = true; store.doc(`users/${users[0].id}`).update({ [`activityMap.${week.id}`]: 4 }).catch(reject); }
            } catch (error) { clearTimeout(timeout); unsubscribe(); reject(error); }
        }, reject);
    });
    console.log('Passed: theme allowlist, family selection, outsider denial, unchanged goals, parent start/race, immutable goal, family reads/live updates, schema/target/date validation.');
} finally {
    await signOut(services.auth);
    await admin.firestore().recursiveDelete(store.doc(`familyCircles/${familyId}`));
    for (const user of users) { await store.doc(`users/${user.id}`).delete(); await admin.auth().deleteUser(user.id); }
    await terminate(services.db);
    await Promise.all(getApps().map(app => deleteApp(app)));
    await admin.app().delete();
}
