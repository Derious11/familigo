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
const {recordChallenge}=require('../functions/lib/achievements/backend');
const {chromium}=await import(pathToFileURL(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
const id='browser-'+Date.now(),family=id+'-family',email=id+'@example.test',password='Fixture-only-42!';
const config={apiKey:'demo-key',projectId:'demo-familigo-review',authDomain:'localhost',storageBucket:'demo-familigo-review.appspot.com',appId:'demo-review',messagingSenderId:'000000000000'};
const server=await createServer({configFile:false,mode:'emulator',plugins:[react(),{name:'local-review',enforce:'pre',transform(code,id){if(id.endsWith('/firebaseConfig.ts'))return code.replace('http://127.0.0.1:9095','http://127.0.0.1:9195').replace("db, '127.0.0.1', 8085","db, '127.0.0.1', 8185").replace("storage, '127.0.0.1', 9195","storage, '127.0.0.1', 9295")}}],define:{__FIREBASE_CONFIG__:JSON.stringify(config),'process.env.API_KEY':'undefined','process.env.GEMINI_API_KEY':'undefined'},server:{host:'127.0.0.1',port:4182,strictPort:true}});
await server.listen();
const browser=await chromium.launch({headless:true,channel:'chrome'}),results=[];
try{
await admin.auth().createUser({uid:id,email,password,emailVerified:true});
await db.doc('users/'+id).set({name:'Review Parent',role:'adult',status:'active',familyCircleId:family,streak:1,xp:100,level:1,activityMap:{},weightUnit:'lbs',progressHistoryVersion:1});
await db.doc('familyCircles/'+family).set({name:'Review Family',memberIds:[id],members:{[id]:true},adminIds:[id],betaApproved:true,messageCount:0});
for(const width of [390,1440]){
const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
await context.route('**/recordSignIn',r=>r.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:'{"result":{"updated":false}}'}));
let failPost=true;
await context.route('**/recordChallenge',async r=>{
if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,content-type'}});
if(failPost){failPost=false;return r.fulfill({status:503,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:'{"error":{"status":"UNAVAILABLE","message":"Injected retry test"}}'})}
const result=await recordChallenge.run(r.request().postDataJSON().data,{auth:{uid:id,token:{}}});return r.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:JSON.stringify({result})});
});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4182/login');
await page.getByLabel('Email address').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);
await page.locator('button[type=submit]').click();
await page.getByRole('button',{name:'Create a challenge',exact:false}).first().waitFor({timeout:30000});
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
const expiryRef=db.doc('challenges/'+id+'-expiry-'+width);
await expiryRef.set({familyCircleId:family,challenger:{id,name:'Review Parent'},exercise:{name:'Walk'},target:'Expiry boundary fixture '+width,type:'individual',completedBy:[],timestamp:admin.firestore.Timestamp.now(),expiresAt:admin.firestore.Timestamp.fromMillis(Date.now()+2000)});
await page.getByText('Expiry boundary fixture '+width,{exact:true}).waitFor();
await page.getByText('Expiry boundary fixture '+width,{exact:true}).waitFor({state:'hidden',timeout:10000});
await page.getByRole('button',{name:'Leaderboard',exact:true}).click();
await page.getByRole('button',{name:'Past Challenges',exact:true}).click();
await page.getByText('Expiry boundary fixture '+width,{exact:true}).waitFor();
await page.getByRole('button',{name:'Profile',exact:true}).click();
await page.getByRole('button',{name:'Edit profile',exact:true}).click();
await page.getByRole('dialog').waitFor();
for(let i=0;i<25;i++){await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>!!document.activeElement?.closest('[role=dialog]')))}
await page.keyboard.press('Escape');
await page.getByRole('dialog').waitFor({state:'hidden'});
assert.equal(await page.getByRole('button',{name:'Edit profile',exact:true}).evaluate(el=>el===document.activeElement),true);
await page.getByRole('button',{name:'Your activity and weight history',exact:true}).click();
await page.getByText('No recorded history yet.',{exact:true}).waitFor();
await page.getByRole('button',{name:'Update weight',exact:true}).click();
await page.getByLabel('Your Weight',{exact:true}).fill('150');
await context.setOffline(true);
await page.getByRole('heading',{name:'You’re offline',exact:true}).waitFor();
await context.setOffline(false);
await page.getByLabel('Your Weight',{exact:true}).waitFor();
assert.equal(await page.getByLabel('Your Weight',{exact:true}).inputValue(),'150');
await page.getByRole('dialog').locator('button[type=submit]').click();
await page.getByRole('dialog').waitFor({state:'hidden'});
await page.getByRole('button',{name:'Weight',exact:true}).click();
await page.getByRole('listitem').getByText('150 lbs',{exact:true}).first().waitFor();

for(const tab of ['Feed','Chat','Leaderboard','Profile']){
await page.getByRole('button',{name:tab,exact:true}).click();
await page.waitForTimeout(250);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
}
await page.evaluate(()=>document.documentElement.classList.add('dark'));
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.getByRole('button',{name:'Edit profile',exact:true}).click();
assert.ok(await page.getByRole('dialog').evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration)<=0.001));
await page.keyboard.press('Escape');
results.push({width,keyboardFocus:true,draftRetry:true,expiryTransition:true,offlineWeightDraftRestored:true,emptyHistory:true,darkOverflow:false,errors});
await context.close();
}
await fs.writeFile('.test-artifacts/accessibility-recovery.json',JSON.stringify(results,null,2));
assert.ok(results.every(r=>!r.errors.length));console.log(JSON.stringify(results));
}finally{
await browser.close();await server.close();await db.recursiveDelete(db.doc('users/'+id));await db.recursiveDelete(db.doc('familyCircles/'+family));
for(const name of ['challenges','achievementEvents']){const rows=await db.collection(name).where('familyCircleId','==',family).get();for(const row of rows.docs)await row.ref.delete()}
await admin.auth().deleteUser(id);await db.terminate();
}
