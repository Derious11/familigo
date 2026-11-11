import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8185')throw Error('Local emulators required');
process.env.GCLOUD_PROJECT='demo-familigo-review';
const require=createRequire(import.meta.url),admin=require('../functions/node_modules/firebase-admin');admin.initializeApp({projectId:'demo-familigo-review'});const db=admin.firestore();
const {chromium}=await import(pathToFileURL(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
const config={apiKey:'demo-key',projectId:'demo-familigo-review',authDomain:'localhost',storageBucket:'demo-familigo-review.appspot.com',appId:'demo-review',messagingSenderId:'000000000000'};
const server=await createServer({configFile:false,mode:'emulator',optimizeDeps:{include:['posthog-js','firebase/auth','firebase/firestore','firebase/app','firebase/storage','firebase/functions','firebase/messaging','react-dom/client','lucide-react','canvas-confetti','@capacitor/core']},plugins:[react(),{name:'local-review',enforce:'pre',transform(code,id){if(id.endsWith('/firebaseConfig.ts')||id.endsWith('/firebaseAuth.ts'))return code.replace('http://127.0.0.1:9095','http://127.0.0.1:9195').replace("db, '127.0.0.1', 8085","db, '127.0.0.1', 8185").replace("storage, '127.0.0.1', 9195","storage, '127.0.0.1', 9295")}}],define:{__FIREBASE_CONFIG__:JSON.stringify(config),'process.env.API_KEY':'undefined','process.env.GEMINI_API_KEY':'undefined'},server:{watch:null,hmr:false,host:'127.0.0.1',port:4182,strictPort:true}});
await server.listen();
const id='art-'+Date.now(),other=id+'-teen',family=id+'-fam',password='Fixture-Only-42!';
const profile=u=>db.doc('users/'+u),circle=db.doc('familyCircles/'+family);
const browser=await chromium.launch({channel:'chrome'});
try{
 for(const u of [id,other]){
  await admin.auth().createUser({uid:u,email:u+'@example.test',password,emailVerified:true});
  await profile(u).set({name:u===id?'Art parent':'Art teen',role:u===id?'adult':'teen',familyCircleId:family,status:'active',coverPhotoUrl:'/assets/brand/wordmark.webp',lastActiveDate:new Date(),streak:1,xp:0});
 }
 await circle.set({name:'Art family',memberIds:[id,other],members:{[id]:true,[other]:true},adminIds:[id],messageCount:0,betaApproved:true});
 for(const u of [id,other]){
  const context=await browser.newContext({viewport:{width:u===id?390:1280,height:844},serviceWorkers:'block',colorScheme:u===id?'light':'dark'});
  await context.route('**/recordSignIn',r=>r.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:'{"result":{"updated":false}}'}));
  const p=await context.newPage(),art=[];p.on('request',r=>{if(r.url().includes('/assets/profile-art/'))art.push(r.url())});
  await p.goto('http://127.0.0.1:4182/login');await p.getByLabel('Email address').fill(u+'@example.test');await p.getByLabel('Password',{exact:true}).fill(password);await p.locator('button[type=submit]').click();
  const later=p.getByRole('button',{name:'Maybe later',exact:true});await later.waitFor({timeout:5000}).then(()=>later.click()).catch(()=>{});
  await p.getByRole('button',{name:'Profile',exact:true}).click();
  await p.getByRole('button',{name:'Edit cover photo'}).waitFor();
  if(u===id){
   assert.equal(art.length,0);
   const edit=p.getByRole('button',{name:'Edit cover photo'}),dialog=p.getByRole('dialog');
   await edit.click();await dialog.getByRole('button',{name:'Garden friends'}).click();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
   assert.equal((await profile(id).get()).get('coverPhotoUrl'),'/assets/brand/wordmark.webp');
   await edit.click();await dialog.getByRole('button',{name:'Mountain lookout'}).click();await dialog.getByRole('button',{name:'Save banner'}).click();
   await dialog.waitFor({state:'hidden'});await p.locator('.app-profile-header img[src$="banner1.webp"]').waitFor();
   assert.equal((await profile(other).get()).get('coverPhotoUrl'),'/assets/brand/wordmark.webp');
  }else{await p.locator('img[src$="crest1.webp"]').waitFor();assert(!art.some(x=>x.includes('/banner/')))}
  const settings=async()=>{await p.getByRole('button',{name:'Manage family'}).click();await p.getByRole('button',{name:'General',exact:true}).click()};
  await settings();const dialog=p.getByRole('dialog');
  if(u===id){
   await dialog.getByRole('button',{name:'Lightning',exact:true}).click();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal((await circle.get()).get('avatarUrl'),undefined);
   await settings();await dialog.getByRole('button',{name:'Compass',exact:true}).click();await dialog.getByRole('button',{name:'Save Details'}).click();await dialog.waitFor({state:'hidden'});await p.locator('img[src$="crest1.webp"]').first().waitFor();
  }else{
   assert.equal(await dialog.getByRole('button',{name:'Compass',exact:true}).count(),0);
   const {initializeApp,deleteApp}=await import('firebase/app'),{getAuth,connectAuthEmulator,signInWithEmailAndPassword}=await import('firebase/auth'),{getFirestore,connectFirestoreEmulator,doc,updateDoc,terminate}=await import('firebase/firestore');
   const app=initializeApp(config),auth=getAuth(app),client=getFirestore(app);
   connectAuthEmulator(auth,'http://127.0.0.1:9195',{disableWarnings:true});connectFirestoreEmulator(client,'127.0.0.1',8185);
   try{await signInWithEmailAndPassword(auth,other+'@example.test',password);
    await assert.rejects(updateDoc(doc(client,'familyCircles',family),{avatarUrl:'/assets/profile-art/crest/crest2.webp'}),e=>e.code==='permission-denied');
   }finally{await terminate(client);await deleteApp(app)}
  }
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await context.close();
 }
 console.log('PASS: lazy artwork, banner and crest cancel/save, profile isolation, shared crest visibility, member denial, light/mobile and dark/desktop');
}finally{await browser.close();await server.close();for(const u of [id,other]){await db.recursiveDelete(profile(u));await admin.auth().deleteUser(u)}await circle.delete();await db.terminate()}