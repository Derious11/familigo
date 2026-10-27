import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signInWithEmailAndPassword} from 'firebase/auth';
import {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,updateDoc,writeBatch,serverTimestamp,collection,query,where,orderBy,limit,startAfter,documentId,getDocs,onSnapshot,terminate,Timestamp} from 'firebase/firestore';
import {livePages} from '../src/lib/livePages.mjs';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8185'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9195')throw Error('Dedicated local emulators required');
process.env.GCLOUD_PROJECT='demo-familigo-review';
const require=createRequire(import.meta.url),{db}=require('../functions/lib/init'),admin=require('../functions/node_modules/firebase-admin');
const {archiveProfileHistory}=require('../functions/lib/historyMigration');
const {activityProgress}=require('../functions/lib/progress');
const id='scale-'+Date.now(),family=id+'-family',profile=db.doc('users/'+id);
const app=initializeApp({projectId:'demo-familigo-review',apiKey:'demo-key'});
const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9195',{disableWarnings:true});
const client=getFirestore(app);connectFirestoreEmulator(client,'127.0.0.1',8185);
globalThis.testDb=client;
let pager;
const metrics={active:0,peak:0,subscriptions:0,snapshots:0,documentsDelivered:0,maxSnapshot:0};
try{
await admin.auth().createUser({uid:id,email:id+'@example.test',password:'Fixture-only-42!'});
await admin.auth().setCustomUserClaims(id,{admin:true});
await signInWithEmailAndPassword(auth,id+'@example.test','Fixture-only-42!');
const now=Date.now(),activityMap={};
for(let i=0;i<800;i++)activityMap[new Date(now-i*86400000).toISOString().slice(0,10)]=i+1;
const weightHistory=Array.from({length:500},(_,i)=>({value:100+i/10,timestamp:admin.firestore.Timestamp.fromMillis(now-i*86400000)}));
await profile.set({name:'Large fixture',role:'adult',status:'active',familyCircleId:family,activityMap,weightHistory,xp:510});
await db.doc('familyCircles/'+family).set({memberIds:[id],members:{[id]:true},adminIds:[id]});
const original=await profile.get();await archiveProfileHistory(db,original);
let actor=(await profile.get()).data();
assert.equal(Object.keys(actor.activityMap).length,90);assert.equal(actor.weightHistory.length,0);assert.equal(actor.xp,510);
assert.equal((await profile.collection('activityDays').get()).size,800);
assert.equal((await profile.collection('weightEntries').get()).size,500);
assert.equal(await archiveProfileHistory(db,await profile.get()),false);
assert.equal(Object.keys(activityProgress(actor,admin.firestore.Timestamp.fromMillis(now+86400000))).length,90);
const weight=doc(client,'users',id,'weightEntries','new-weight'),user=doc(client,'users',id);
await assert.rejects(()=>updateDoc(user,{currentWeight:120,weightUnit:'lbs'}),e=>e.code==='permission-denied');
const batch=writeBatch(client);batch.set(weight,{value:120,unit:'lbs',timestamp:serverTimestamp()});batch.update(user,{currentWeight:120,weightUnit:'lbs',lastWeightEntryId:'new-weight'});await batch.commit();
assert.equal((await getDoc(weight)).data().value,120);
await assert.rejects(()=>updateDoc(weight,{value:130}),e=>e.code==='permission-denied');
for(let offset=0;offset<125;offset+=50){const batch=db.batch();for(let i=offset;i<Math.min(125,offset+50);i++){
batch.set(db.doc('users/'+id+'-'+i),{name:'Fixture '+i,role:'adult',status:'pending_approval'});
batch.set(db.doc('challenges/'+id+'-'+i),{familyCircleId:family,timestamp:admin.firestore.Timestamp.fromMillis(now-i*1000),expiresAt:admin.firestore.Timestamp.fromMillis(now+(i%2?1:-1)*(i+1)*100000)});
}await batch.commit()}
await build({entryPoints:['src/services/adminService.ts'],bundle:true,platform:'node',format:'esm',outfile:'.test-artifacts/admin-page-test.mjs',packages:'external',plugins:[{name:'fixture',setup(b){b.onResolve({filter:/firebaseConfig$/},()=>({path:'fixture',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const db = globalThis.testDb;'}));}}]});
const {getAdminUsers}=await import(pathToFileURL(process.cwd()+'/.test-artifacts/admin-page-test.mjs').href);
let cursor;const ids=new Set();for(;;){const p=await getAdminUsers(cursor);assert.ok(p.items.length<=50);for(const row of p.items)ids.add(row.id);if(!p.hasMore)break;cursor=p.cursor}
assert.ok(Array.from({length:125},(_,i)=>id+'-'+i).every(key=>ids.has(key)));
for(const op of ['>','<=']){
let cursor,total=0;
for(;;){const q=query(collection(client,'challenges'),where('familyCircleId','==',family),where('expiresAt',op,Timestamp.fromMillis(now)),orderBy('expiresAt','desc'),orderBy(documentId(),'desc'),...(cursor?[startAfter(cursor)]:[]),limit(30));const p=await getDocs(q);assert.ok(p.size<=30);for(const row of p.docs)assert.equal(row.get('expiresAt').toMillis()>now,op==='>');total+=p.size;if(p.size<30)break;cursor=p.docs.at(-1)}
assert.equal(total,op==='>'?62:63);
}
let state;const wait=async test=>{for(let i=0;i<300;i++){if(test())return;await new Promise(r=>setTimeout(r,10))}throw Error('Timed out')};
for(let cycle=0;cycle<10;cycle++){
pager=livePages({pageSize:30,key:s=>s.id,compare:(a,b)=>b.get('timestamp').toMillis()-a.get('timestamp').toMillis(),publish:s=>{state=s},listen(cursor,receive,fail){
metrics.active++;metrics.peak=Math.max(metrics.peak,metrics.active);metrics.subscriptions++;
const unsub=onSnapshot(query(collection(client,'challenges'),where('familyCircleId','==',family),orderBy('timestamp','desc'),...(cursor?[startAfter(cursor)]:[]),limit(30)),snap=>{metrics.snapshots++;metrics.documentsDelivered+=snap.size;metrics.maxSnapshot=Math.max(metrics.maxSnapshot,snap.size);receive(snap.docs)},fail);
return()=>{metrics.active--;unsub()};
}});
await wait(()=>state&&!state.loading);for(let page=0;page<3;page++){pager.loadMore();await wait(()=>!state.loading)}
assert.equal(state.items.length,120);pager.stop();assert.equal(metrics.active,0);state=null;
}
await fs.writeFile('.test-artifacts/scale-measurements.json',JSON.stringify({kind:'emulator simulated long-session sequence; snapshot deliveries are not billed reads',metrics},null,2));
console.log(JSON.stringify({pass:true,archivedDays:800,archivedWeights:500,retainedDays:90,adminFixtureAccounts:125,active:62,past:63,metrics}));
}finally{
pager?.stop();await terminate(client);await deleteApp(app);
await db.recursiveDelete(profile);await db.doc('familyCircles/'+family).delete();
for(let i=0;i<125;i++){await db.doc('users/'+id+'-'+i).delete();await db.doc('challenges/'+id+'-'+i).delete()}
await admin.auth().deleteUser(id);await db.terminate();
}
