import path from 'node:path';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let sharp;
try { sharp = require('sharp'); }
catch { sharp = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp')); }
const output = 'public/assets/brand';
await fs.mkdir(output, { recursive: true });
const wordmark = 'design-assets/branding-concepts/wordmark-01.png';
await sharp(wordmark).trim().resize({ width: 640 }).webp({ lossless: true }).toFile(`${output}/wordmark.webp`);
for (const size of [16, 32, 48, 180, 192, 512]) {
    await sharp('design-assets/branding-concepts/icon-01.png').resize(size, size).png({ compressionLevel: 9 }).toFile(`${output}/icon-${size}.png`);
}
for (const [source, target, width] of [
    ['design-assets/marketing/gogo-thumbs-up.png', 'gogo-thumbs-up.webp', 480],
    ['design-assets/branding-concepts/gogo-01.png', 'gogo-wave.webp', 480],
    ['design-assets/branding-concepts/gogo-02.png', 'gogo-celebrate.webp', 480],
    ['design-assets/marketing/challenge-creation-source.png', 'challenge-creation.webp', 760],
]) {
    await sharp(source).resize({ width }).webp({ quality: 85, alphaQuality: 100 }).toFile(`${output}/${target}`);
}
const files = await fs.readdir(output);
for (const name of files) console.log(`${name}: ${(await fs.stat(path.join(output, name))).size} bytes`);
