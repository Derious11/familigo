import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {initializeApp, deleteApp} from 'firebase/app';
import {getAuth, connectAuthEmulator, signInWithEmailAndPassword} from 'firebase/auth';
import {getFirestore, connectFirestoreEmulator, doc, updateDoc, setDoc, serverTimestamp, terminate, deleteField} from 'firebase/firestore';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8185'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9195') throw Error('Dedicated emulators required');
process.env.GCLOUD_PROJECT='demo-familigo-review';
const require=createRequire(import.meta.url);
const {db}=require('../functions/lib/init');
const admin=require('../functions/node_modules/firebase-admin');
const {Timestamp}=admin.firestore;
const {recordSignIn,signInProgress}=require('../functions/lib/callables/recordSignIn');
const {recordChallengeReply}=require('../functions/lib/achievements/backend');
const now=Timestamp.fromDate(new Date('2026-10-26T12:00:00Z'));
assert.equal(signInProgress({lastActiveDate:now},now),null);
assert.equal(signInProgress({lastActiveDate:Timestamp.fromMillis(now.toMillis()+86400000)},now),null);
assert.equal(signInProgress({streak:4},now).streak,4);
assert.equal(signInProgress({streak:4,lastActiveDate:Timestamp.fromMillis(now.toMillis()-2*86400000)},now).xp,5);
assert.equal(signInProgress({streak:4,lastActiveDate:Timestamp.fromMillis(now.toMillis()-86400000),xp:495},now).level,2);
const id='progress-'+Date.now(), child=id+'-child', family=id+'-family', challenge=id+'-challenge';
const app=initializeApp({projectId:'demo-familigo-review',apiKey:'demo-key'});
const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9195',{disableWarnings:true});
const client=getFirestore(app);connectFirestoreEmulator(client,'127.0.0.1',8185);
const denied=fn=>assert.rejects(fn,e=>e.code==='permission-denied');
try {
 await admin.auth().createUser({uid:id,email:id+'@example.test',password:'Fixture-only-42!'});
 await signInWithEmailAndPassword(auth,id+'@example.test','Fixture-only-42!');
 await denied(()=>setDoc(doc(client,'users',id),{name:'Fixture',role:'adult',status:'pending_approval',streak:1,xp:99999}));
 await setDoc(doc(client,'users',id),{name:'Fixture',role:'adult',status:'pending_approval',streak:1,lastActiveDate:serverTimestamp()});
 await db.doc('users/'+id).set({name:'Fixture',role:'adult',status:'active',familyCircleId:family,xp:490,level:1,streak:3,lastActiveDate:Timestamp.fromMillis(Date.now()-86400000)});
 await db.doc('familyCircles/'+family).set({memberIds:[id,child],members:{[id]:true,[child]:true},adminIds:[id]});
 await db.doc('users/'+child).set({role:'child',parentId:id,familyCircleId:family,streak:0});
 for(const field of ['xp','level','streak','activityMap','lastActiveDate']){
   await denied(()=>updateDoc(doc(client,'users',id),{[field]:999}));
   await denied(()=>updateDoc(doc(client,'users',child),{[field]:999}));
 }
 await denied(()=>updateDoc(doc(client,'users',id),{xp:deleteField()}));
 await updateDoc(doc(client,'users',id),{name:'Updated'});
 await assert.rejects(()=>recordSignIn.run({},{}),e=>e.code==='unauthenticated');
 await db.doc('challenges/'+challenge).set({familyCircleId:family,challenger:{id},exercise:{name:'Walk'},type:'individual',timestamp:Timestamp.now(),expiresAt:Timestamp.fromMillis(Date.now()+86400000)});
 const context={auth:{uid:id,token:{}}};
 await Promise.all([
   ...Array.from({length:8},()=>recordSignIn.run({actorId:child,xp:999999,timestamp:0},context)),
   recordChallengeReply.run({actorId:id,familyCircleId:family,challengeId:challenge,requestId:id+'-reply',text:'Hello'},context)
 ]);
 const actor=(await db.doc('users/'+id).get()).data();
 assert.equal(actor.xp,510);assert.equal(actor.level,2);assert.equal(actor.streak,4);
 const day=new Date().toISOString().slice(0,10);assert.equal(actor.activityMap[day],2);
 await recordSignIn.run({},context);
 assert.equal((await db.doc('users/'+id).get()).data().xp,510);
 assert.equal((await db.doc('users/'+child).get()).data().streak,0);
 console.log('PASS: forgery denied on create/update/delete; profile edits allowed; parent cannot forge child progress; 8 concurrent sign-ins plus reply preserve XP/activity exactly once; retry and date boundaries verified');
} finally {
 await terminate(client);await deleteApp(app);
 await db.recursiveDelete(db.doc('familyCircles/'+family));
 for(const p of ['users/'+id,'users/'+child,'challenges/'+challenge,'replies/'+id+'-reply','achievementEvents/reply_'+id+'-reply','achievementProfiles/'+id])await db.doc(p).delete();
 await admin.auth().deleteUser(id);await db.terminate();
}

