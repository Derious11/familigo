import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8185' || process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9195') throw Error('Dedicated local emulators required.');
const require=createRequire(import.meta.url);const admin=require('../functions/node_modules/firebase-admin');
admin.initializeApp({projectId:'demo-familigo-review'});const store=admin.firestore();
const {chromium}=await import(pathToFileURL(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
const uid='review-browser';const family='review-browser-family';const password='Browser-fixture-only-42!';
try{await admin.auth().createUser({uid,email:'review-browser@example.test',password,emailVerified:true});}catch(error){if(error.code!=='auth/uid-already-exists')throw error;}
await store.doc(`users/${uid}`).set({name:'Review Parent',email:'review-browser@example.test',role:'adult',status:'active',familyCircleId:family,streak:1,xp:0,activityMap:{},badges:[],hasAvatar:false,weightHistory:[],lastActiveDate:admin.firestore.Timestamp.now()});
await store.doc(`familyCircles/${family}`).set({name:'Review Family',memberIds:[uid],members:{[uid]:true},adminIds:[uid],messageCount:95,betaApproved:false});
const batch=store.batch();
for (const message of (await store.collection('messages').where('familyCircleId','==',family).get()).docs) batch.delete(message.ref);
for(let i=0;i<95;i++)batch.set(store.doc(`messages/browser-${String(i).padStart(3,'0')}`),{familyCircleId:family,senderId:uid,senderName:'Review Parent',text:`History message ${i}`,type:'text',timestamp:admin.firestore.Timestamp.fromMillis(100000+i)});
for(let i=0;i<65;i++)batch.set(store.doc(`challenges/browser-${i}`),{familyCircleId:family,challenger:{id:uid,name:'Review Parent'},exercise:{name:'Walking',description:'Walk together',visualGuideUrl:''},target:'10 minutes',type:'individual',timestamp:admin.firestore.Timestamp.fromMillis(100000+i),expiresAt:admin.firestore.Timestamp.fromMillis(Date.now()+(i%2 ? -86400000 : 86400000)),completedBy:[]});
await batch.commit();
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});const errors=[];const checks=[];
page.on('pageerror',error=>errors.push(error.message));
const pass=message=>{checks.push(message);console.log(`PASS: ${message}`);};
try{
  await page.goto('http://127.0.0.1:4180/login');
  await page.getByLabel('Email address',{exact:true}).fill('review-browser@example.test');
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Log In',exact:true}).click();
  await page.getByRole('navigation',{name:'App navigation'}).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Chat',exact:false}).first().click();
  await page.waitForFunction(()=>document.querySelectorAll('[data-message-id]').length===30);
  const panel=page.getByRole('log');await panel.evaluate(el=>{el.scrollTop=0;el.dispatchEvent(new Event('scroll'));});
  const anchor=await page.locator('[data-message-id]').first().getAttribute('data-message-id');
  await page.getByRole('button',{name:'Load older messages'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('[data-message-id]').length===60);
  const visible=await panel.evaluate((el,id)=>{const a=el.querySelector(`[data-message-id="${id}"]`);return Math.abs(a.getBoundingClientRect().top-el.getBoundingClientRect().top)<150;},anchor);
  assert.ok(visible,'older history preserves the visible anchor');
  pass('chat loads 30 then 60 messages and preserves the reading position');
  await panel.evaluate(el=>{el.scrollTop=el.scrollHeight;el.dispatchEvent(new Event('scroll'));});
  await page.getByLabel('Message your family',{exact:true}).fill('Browser send test');
  await page.getByRole('button',{name:'Send message',exact:true}).click();
  await page.getByText('Browser send test',{exact:true}).waitFor();
  await page.waitForFunction(()=>document.querySelector('input[aria-label="Message your family"]').value==='');
  pass('chat send succeeds through the real atomic writer');
  await page.getByLabel('Message your family',{exact:true}).fill('Keep this offline draft');
  await page.context().setOffline(true);
  await page.getByRole('heading',{name:'You’re offline'}).waitFor();
  await page.context().setOffline(false);
  await page.getByLabel('Message your family',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('Message your family',{exact:true}).inputValue(),'Keep this offline draft');
  pass('offline recovery preserves the draft behind the existing offline screen');
  for(const tab of ['Feed','Profile','Leaderboard']){
    const button=page.getByRole('navigation',{name:'App navigation'}).getByRole('button',{name:tab,exact:false});
    if(await button.count()){
      await button.click();await page.waitForTimeout(700);
      if (tab === 'Feed') {
        await page.getByRole('button',{name:'Show comments for Walking'}).first().click();
        await page.getByLabel('Write a comment',{exact:true}).first().fill('Retain failed comment');
        await page.getByRole('button',{name:'Post comment',exact:true}).first().click();
        await page.getByText('Could not post your comment. Your draft is still here. Please try again.').waitFor();
        assert.equal(await page.getByLabel('Write a comment',{exact:true}).first().inputValue(),'Retain failed comment');
        assert.equal(await page.getByRole('button',{name:'Post comment',exact:true}).first().isEnabled(),true);
        pass('a failed comment retains its draft and re-enables submission');
      }
      if (tab === 'Leaderboard') {
        await page.getByRole('button',{name:'Past Challenges'}).click();
        await page.getByRole('button',{name:'Load older challenges'}).click();
        pass('history opens on demand and offers another bounded page');
      }
      await page.screenshot({path:`artifacts/release-review/app-${tab.toLowerCase()}.png`});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      pass(`${tab} mobile layout has no horizontal overflow`);
    }
  }
  await page.getByRole('button',{name:'Toggle theme'}).click();
  await page.screenshot({path:'artifacts/release-review/app-dark.png'});
  assert.deepEqual(errors,[]);
  await fs.writeFile('artifacts/release-review/app-browser-results.json',JSON.stringify({checks,errors},null,2));
} catch (error) {
  await page.screenshot({path:'artifacts/release-review/app-failure.png'});
  await fs.writeFile('artifacts/release-review/app-failure.json',JSON.stringify({checks,errors,message:String(error),text:await page.locator('body').innerText()},null,2));
  throw error;
} finally {await browser.close();await admin.app().delete();}
