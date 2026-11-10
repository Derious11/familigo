import fs from 'node:fs/promises';
import path from 'node:path';import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
const base=process.env.REVIEW_BASE_URL || 'https://familigo-dev-11643.web.app';
assert.ok(/^https:\/\/familigo-dev-11643(?:--performance-rc-[a-z0-9]+)?\.web\.app$/.test(base));
assert.equal(await (await fetch(base)).text(),await fs.readFile('dist/index.html','utf8'));
const b=await chromium.launch({channel:'chrome'});try{for(const route of ['/','/login','/faq']){
const p=await b.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});let resume;const gate=new Promise(r=>resume=r);
await p.route('**/assets/*.js',async r=>{await gate;await r.continue()});
await p.goto(base+route,{waitUntil:'commit'});
if(route!=='/faq'){
await p.locator('#public-preview h1').waitFor({timeout:10000});
assert.equal(await p.locator('.fg-landing').count(),1);
if(route==='/')await p.locator('#public-preview .fg-menu-button').click();
}else{await p.locator('#root').waitFor({state:'attached'});assert.equal(await p.locator('#public-preview').count(),0)}
resume();await p.locator('#root h1').first().waitFor();
if(route==='/')await p.locator('#fg-mobile-menu').waitFor();
if(route==='/login'){await p.waitForFunction(()=>document.querySelector('.fg-access-google')?.disabled===false);const bad=await p.evaluate(()=>performance.getEntriesByType('resource').map(e=>e.name).filter(n=>/\/firebaseConfig-|\/App-|\/assets\/intro\.mp4|firestore.googleapis.com/.test(n)));assert.deepEqual(bad,[])}
assert.equal(await p.locator('#public-preview').count(),0);
console.log(route,'passed');await p.close()}}finally{await b.close()}
