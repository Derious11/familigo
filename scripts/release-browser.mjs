import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
const label = process.argv[2] || 'baseline';
const baseUrl = process.env.REVIEW_BASE_URL || 'http://127.0.0.1:4174';
if (!['http://127.0.0.1:4174', 'https://familigo-dev-11643.web.app'].includes(baseUrl)) throw Error('Explicit local or development target required.');
if (!/^[a-z0-9-]+$/.test(label)) throw Error('Invalid report label.');
await fs.mkdir('artifacts/release-review', {recursive:true});
const routes = process.argv[3] ? process.argv[3].split(',') : ['/', '/login', '/early-access', '/invite-parent', '/claim-invite', '/faq', '/privacy', '/delete-account'];
const browser = await chromium.launch({headless:true, channel:'chrome'});
const results = [];
try {
  for (const route of routes) {
    const context = await browser.newContext({viewport:{width:390,height:844}, reducedMotion:'reduce', serviceWorkers:'block'});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const session = await context.newCDPSession(page);
    await session.send('Network.enable');
    await session.send('Network.emulateNetworkConditions', {offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750});
    await session.send('Emulation.setCPUThrottlingRate',{rate:4});
    await page.addInitScript(() => {
      window.reviewMetrics = {lcp:0,cls:0};
      new PerformanceObserver(list => { for (const entry of list.getEntries()) window.reviewMetrics.lcp = entry.startTime; }).observe({type:'largest-contentful-paint',buffered:true});
      new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.reviewMetrics.cls += entry.value; }).observe({type:'layout-shift',buffered:true});
    });
    for (const visit of ['cold','repeat']) {
      await page.goto(`${baseUrl}${route}`,{waitUntil:'load'});
      await page.locator('h1, h2').first().waitFor({timeout:30000});
      await page.waitForTimeout(3000);
      results.push({route,visit,...await page.evaluate(() => ({...window.reviewMetrics,resources:performance.getEntriesByType('resource').map(e=>({path:new URL(e.name).origin+new URL(e.name).pathname,duration:Math.round(e.duration),bytes:e.transferSize})).sort((a,b)=>b.duration-a.duration).slice(0,8),overflow:document.documentElement.scrollWidth > innerWidth,jsBytes:performance.getEntriesByType('resource').filter(e=>e.name.endsWith('.js')).reduce((sum,e)=>sum+e.transferSize,0),requests:performance.getEntriesByType('resource').length})), errors:[...errors]});
    }
    await page.screenshot({path:`artifacts/release-review/${label}-${route.replaceAll('/','') || 'home'}.png`});
    await context.close();
  }
} finally { await browser.close(); }
await fs.writeFile(`artifacts/release-review/${label}-browser.json`,JSON.stringify({baseUrl,method:'Single-run Chrome lab, 390x844, CPU 4x, 150ms latency, 1.6Mbps download, service worker blocked; no field INP.',results},null,2));
console.log(JSON.stringify(results));
