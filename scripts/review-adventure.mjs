import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ADVENTURE_THEMES } from '../src/lib/adventureThemes.mjs';
import { TRAIL_POINTS } from '../src/lib/adventure.mjs';
const { chromium } = await import(pathToFileURL(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs')).href);
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
const errors = [];
const screenshot = async name => {
    // The app scrolls #root to support mobile keyboards. Expand only while capturing.
    const style = await page.addStyleTag({ content: 'html,body{position:static!important;height:auto!important;overflow:visible!important}#root{height:auto!important;overflow:visible!important}' });
    await page.evaluate(() => { document.getElementById('root')?.scrollTo(0, 0); window.scrollTo(0, 0); });
    await page.screenshot({ path: `artifacts/design/leaderboard/review/${name}.png`, fullPage: true });
    await style.evaluate(element => element.remove());
};
page.on('pageerror', error => errors.push(error.message));
await fs.mkdir('artifacts/design/leaderboard/review', { recursive: true });
await page.goto('http://127.0.0.1:3000/design-review?screen=leaderboard');
await page.getByRole('heading', { name: 'Go further, together.' }).waitFor();
await page.locator('.adventure-landscape').evaluate(image => image.decode());
await screenshot('desktop-light');
assert.equal(await page.locator('.adventure-ranking li').count(), 4);
assert.equal(await page.locator('.adventure-total strong').innerText(), '29');
const mine = page.locator('.adventure-marker-you');
const before = await mine.getAttribute('style');
await page.getByRole('button', { name: 'Add 2 points' }).click();
assert.equal(await page.locator('.adventure-total strong').innerText(), '31');
assert.notEqual(await mine.getAttribute('style'), before);
await mine.click();
assert.match(await page.locator('.adventure-marker-detail').innerText(), /Alex/);
await page.getByRole('button', { name: 'Close trail member details' }).click();
await page.getByRole('button', { name: 'Take on a challenge', exact: false }).click();
assert.match(await page.locator('.adventure-preview-notice').innerText(), /Challenge action connected/);
await page.getByLabel('Scenario').selectOption('active');
await page.getByRole('button', { name: 'Toggle theme' }).click();
await screenshot('desktop-dark');
await page.locator('.adventure-theme-picker summary').click();
const pointsBeforeTheme = await page.locator('.adventure-total').innerText();
const markerPositions = () => page.locator('.adventure-marker').evaluateAll(markers => markers.map(marker => marker.getAttribute('style')));
const standardPositions = await markerPositions();
for (const theme of ADVENTURE_THEMES) {
    await page.getByRole('button', { name: new RegExp(theme.name) }).click();
    await page.locator(`.adventure-map[data-theme="${theme.id}"]`).waitFor();
    await page.locator('.adventure-landscape').evaluate(image => image.decode());
    assert.equal(await page.locator('.adventure-total').innerText(), pointsBeforeTheme);
    assert.deepEqual(await markerPositions(), standardPositions, 'Switching scenery must not reposition any avatar.');
    assert.equal(await page.getByRole('button', { name: new RegExp(theme.name) }).getAttribute('aria-pressed'), 'true');
    await page.locator('.adventure-map').screenshot({ path: `artifacts/design/leaderboard/review/theme-${theme.id}.png` });
    // One standard diagnostic verifies every background against the same path.
    await page.locator('.adventure-map').evaluate((map, route) => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 1536 1024');
        svg.setAttribute('class', 'route-diagnostic');
        svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:10');
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        line.setAttribute('points', route.map(point => point.join(',')).join(' '));
        line.setAttribute('fill', 'none'); line.setAttribute('stroke', '#ff0080'); line.setAttribute('stroke-width', '5');
        svg.append(line); map.append(svg);
    }, TRAIL_POINTS);
    await page.locator('.adventure-map').screenshot({ path: `artifacts/design/leaderboard/review/route-${theme.id}.png` });
    await page.locator('.route-diagnostic').evaluate(element => element.remove());
}
await screenshot('desktop-theme-picker');
await page.getByRole('button', { name: /Mountain Meadow/ }).click();
await page.locator('.adventure-theme-picker summary').click();
for (const scenario of ['empty', 'ties', 'solo', 'large', 'complete', 'setup']) {
    await page.getByLabel('Scenario').selectOption(scenario);
    assert.equal(await page.locator('.adventure-ranking li').count(), scenario === 'solo' ? 1 : scenario === 'large' ? 12 : 4);
    if (scenario === 'ties') assert.equal(await page.locator('.adventure-marker').count(), 1);
    if (scenario === 'complete') assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '100');
}
await page.getByLabel('Family goal').fill('70');
await page.getByRole('button', { name: 'Start our adventure' }).click();
assert.match(await page.locator('.adventure-total').innerText(), /70/);
assert.equal(await page.getByRole('button', { name: 'Start our adventure' }).count(), 0);
await page.setViewportSize({ width: 360, height: 800 });
await page.getByLabel('Scenario').selectOption('active');
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
await screenshot('mobile-dark');
await page.getByRole('button', { name: 'Toggle theme' }).click();
await screenshot('mobile-light');
await page.locator('.adventure-theme-picker summary').click();
const mobileStandardPositions = await markerPositions();
for (const theme of ADVENTURE_THEMES) {
    await page.getByRole('button', { name: new RegExp(theme.name) }).click();
    await page.locator('.adventure-landscape').evaluate(image => image.decode());
    assert.deepEqual(await markerPositions(), mobileStandardPositions, 'Mobile theme changes must preserve avatar positions.');
    assert.equal(await page.evaluate(() => document.getElementById('root').scrollWidth <= window.innerWidth), true);
    const ratio = await page.locator('.adventure-map').evaluate(map => map.clientWidth / map.clientHeight);
    assert.ok(Math.abs(ratio - 1.5) < .02);
    await page.locator('.adventure-map').screenshot({ path: `artifacts/design/leaderboard/review/mobile-theme-${theme.id}.png` });
}
await screenshot('mobile-theme-picker');
await page.getByLabel('Scenario').selectOption('setup');
await screenshot('mobile-setup');
await page.getByLabel('Scenario').selectOption('large');
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
await screenshot('mobile-large');
assert.deepEqual(errors, []);
await browser.close();
console.log('Passed: one standard route across four themes, identical desktop/mobile marker positions after theme changes, unchanged goals/points, alignment captures, point movement, goal setup, family edge cases, light/dark and 360px overflow.');
