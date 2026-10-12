import path from 'node:path';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let sharp;
try { sharp = require('sharp'); }
catch { sharp = require(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp')); }

const names = ['push-ups', 'squats', 'plank', 'run', 'walk', 'burpees', 'solo', 'team'];
const output = 'public/assets/brand/activities';
await fs.mkdir(output, { recursive: true });
for (const name of names) {
    const source = `design-assets/challenge-icons/gogo-${name}.png`;
    const metadata = await sharp(source).metadata();
    if (!metadata.hasAlpha) throw new Error(`${source} must have transparency`);
    const trimmed = await sharp(source).trim().toBuffer();
    for (const size of [96, 144]) {
        const padding = Math.round(size * 0.1);
        const icon = await sharp(trimmed)
            .resize(size - 2 * padding, size - 2 * padding, { fit: 'contain', background: '#00000000' })
            .extend({ top: padding, bottom: padding, left: padding, right: padding, background: '#00000000' })
            .webp({ quality: 90, alphaQuality: 100 })
            .toBuffer();
        const target = `${output}/gogo-${name}${size === 144 ? '@3x' : ''}.webp`;
        await fs.writeFile(target, icon);
        console.log(`${target}: ${icon.length} bytes`);
    }
}
