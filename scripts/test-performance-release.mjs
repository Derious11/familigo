import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8185')throw Error('Local emulators required');
process.env.GCLOUD_PROJECT='demo-familigo-review';
const require=createRequire(import.meta.url),{db}=require('../functions/lib/init'),admin=require('../functions/node_modules/firebase-admin');
const {recordChallenge,recordChallengeReply}=require('../functions/lib/achievements/backend');
const {chromium}=await import(pathToFileURL(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
const id='browser-'+Date.now(),family=id+'-family',email=id+'@example.test',password='Fixture-only-42!';
const config={apiKey:'demo-key',projectId:'demo-familigo-review',authDomain:'localhost',storageBucket:'demo-familigo-review.appspot.com',appId:'demo-review',messagingSenderId:'000000000000'};
const server=await createServer({configFile:false,mode:'emulator',optimizeDeps:{include:['posthog-js','firebase/auth','firebase/firestore','firebase/app','firebase/storage','firebase/functions','firebase/messaging','react-dom/client','lucide-react','canvas-confetti','@capacitor/core']},plugins:[react(),{name:'local-review',enforce:'pre',transform(code,id){if(id.endsWith('/firebaseConfig.ts')||id.endsWith('/firebaseAuth.ts'))return code.replace('http://127.0.0.1:9095','http://127.0.0.1:9195').replace("db, '127.0.0.1', 8085","db, '127.0.0.1', 8185").replace("storage, '127.0.0.1', 9195","storage, '127.0.0.1', 9295")}}],define:{__FIREBASE_CONFIG__:JSON.stringify(config),'process.env.API_KEY':'undefined','process.env.GEMINI_API_KEY':'undefined'},server:{watch:null,hmr:false,host:'127.0.0.1',port:4182,strictPort:true}});
await server.listen();
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}),results=[];
try{
await admin.auth().createUser({uid:id,email,password,emailVerified:true});
await db.doc('users/'+id).set({name:'Review Parent',role:'adult',status:'active',familyCircleId:family,streak:1,xp:100,level:1,activityMap:{},weightUnit:'lbs'});
await db.doc('familyCircles/'+family).set({name:'Review Family',memberIds:[id],members:{[id]:true},adminIds:[id],betaApproved:true,messageCount:0});
for(const width of [390,1440]){
const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
let failPost=true;
await context.route('**/recordChallenge',async r=>{
if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,content-type'}});
if(r.request().postDataJSON().data.prepareOnly)return r.fulfill({status:200,contentType:"application/json",headers:{"Access-Control-Allow-Origin":"*"},body:JSON.stringify({result:{ready:true}})});
if(failPost){failPost=false;return r.fulfill({status:503,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:'{"error":{"status":"UNAVAILABLE","message":"Injected retry test"}}'})}
const result=await recordChallenge.run(r.request().postDataJSON().data,{auth:{uid:id,token:{}}});return r.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:JSON.stringify({result})});
});
await context.route('**/recordChallengeReply',async r=>{
 if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,content-type'}});
 const result=await recordChallengeReply.run(r.request().postDataJSON().data,{auth:{uid:id,token:{}}});
 return r.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:JSON.stringify({result})});
});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4182/login?inviteCode=demo');
await page.waitForFunction(()=>sessionStorage.getItem('pendingInviteCode')==='DEMO');
await page.evaluate(()=>sessionStorage.removeItem('pendingInviteCode'));
if(width===390){
  const popupPromise=context.waitForEvent('page');
  await page.getByRole('button',{name:'Sign in with Google'}).click();
  const popup=await popupPromise;await popup.close();
  await page.waitForFunction(()=>!document.querySelector('button.fg-access-google')?.disabled);
    assert.equal(new URL(page.url()).pathname,'/login');
  const oauth=await browser.newContext({serviceWorkers:'block'});
  try {
    const callback=await oauth.newPage();
    await callback.goto('http://127.0.0.1:4182/login');
    const opening=oauth.waitForEvent('page');
    await callback.getByRole('button',{name:'Sign in with Google'}).click();
    const provider=await opening;
    await provider.waitForLoadState('load');
    for(let i=0;i<5 && !await provider.locator('#email-input').isVisible();i++){await provider.locator('#add-account-button button').click();await provider.locator('#email-input').waitFor({timeout:1000}).catch(()=>{})}
    await provider.locator('#email-input').fill('oauth-'+email);
    await provider.locator('#display-name-input').fill('Development OAuth fixture');
    await provider.locator('#sign-in').click();
    await callback.waitForURL('**/app');
    const account=await admin.auth().getUserByEmail('oauth-'+email);
    assert.equal((await db.doc('users/'+account.uid).get()).get('status'),'pending_approval');
    await db.recursiveDelete(db.doc('users/'+account.uid));await admin.auth().deleteUser(account.uid);
  } finally { await oauth.close(); }
}
await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);
await page.locator('button[type=submit]').click();
await page.getByRole('button',{name:'Create a challenge',exact:false}).first().waitFor({timeout:30000});
await page.goto('http://127.0.0.1:4182/login');
await page.waitForURL('**/app');
await page.getByRole('button',{name:'Maybe later',exact:true}).click();
await page.getByRole('button',{name:'Create a challenge',exact:false}).first().click();
const dialog=page.getByRole('dialog');
await dialog.getByRole('button',{name:'Push-ups',exact:true}).click();
await page.getByLabel('Target',{exact:true}).fill('Browser retry target');
await dialog.getByRole('button',{name:'Post Challenge',exact:false}).click();
await dialog.getByRole('alert').waitFor();
assert.equal(await page.getByLabel('Target',{exact:true}).inputValue(),'Browser retry target');
await dialog.getByRole('button',{name:'Post Challenge',exact:false}).click();
await dialog.waitFor({state:'hidden'});

await page.getByRole('button',{name:'Mark Complete'}).first().click();
const complete=page.getByRole('dialog');await complete.locator('textarea').fill('Finished');
if(width===390){
 await context.grantPermissions(['camera'],{origin:'http://127.0.0.1:4182'});
 await complete.getByRole('button',{name:/Add Photo Proof/}).click();
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('video')).some(v=>v.srcObject && v.videoWidth>0 && v.readyState>=2));
 await page.getByRole('button',{name:'Capture photo'}).click(); await page.getByAltText('Proof',{exact:true}).waitFor();
}
await complete.getByRole('button',{name:'Complete Challenge'}).click();
await complete.waitFor({state:'hidden'});
const replies=await db.collection('replies').where('familyCircleId','==',family).get();
assert.ok(replies.docs.some(x=>x.get('text')==='Finished' && !!x.get('mediaUrl')===(width===390)));
assert.deepEqual(errors,[]);console.log('PASS login, restored session, post retry and '+(width===390?'photo':'text')+' completion at '+width);
await context.close();
}
}finally{
await browser.close();await server.close();await db.recursiveDelete(db.doc('users/'+id));await db.recursiveDelete(db.doc('familyCircles/'+family));
for(const name of ['challenges','achievementEvents']){const rows=await db.collection(name).where('familyCircleId','==',family).get();for(const row of rows.docs)await row.ref.delete()}
await admin.auth().deleteUser(id);await db.terminate();
}
