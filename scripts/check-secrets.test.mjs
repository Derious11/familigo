import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const scanner = fileURLToPath(new URL('./check-secrets.mjs', import.meta.url));
test('checks staged and historical credentials, redacts output, and limits Firebase exceptions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'familigo-secret-check-'));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const scan = (...args) => spawnSync(process.execPath, [scanner, ...args], { cwd: dir, encoding: 'utf8' });
  const commit = () => git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-qm', 'Fixture');
  try {
    git('init', '--quiet');
    const synthetic = 're_' + 'A'.repeat(32);
    writeFileSync(join(dir, 'credential.txt'), 'RESEND_API_KEY=' + synthetic);
    git('add', 'credential.txt');
    writeFileSync(join(dir, 'credential.txt'), 'redacted');
    const blocked = scan('--staged');
    assert.equal(blocked.status, 1, 'index must be checked even when working file is clean');
    assert.ok(!blocked.stderr.includes(synthetic), 'values must not appear in output');
    commit();
    const exposedRevision = git('rev-parse', 'HEAD');
    git('add', 'credential.txt');
    commit();
    assert.equal(scan().status, 0, 'clean HEAD should pass');
    assert.equal(scan('--ref', exposedRevision).status, 1, 'earlier exposed commit must be detectable');
    writeFileSync(join(dir, '.env.development'), 'VITE_FIREBASE_API_KEY=' + 'AIza' + 'A'.repeat(35));
    git('add', '.env.development');
    assert.equal(scan('--staged').status, 0, 'public Firebase config is allowed');
    writeFileSync(join(dir, 'credential.txt'), 'VITE_FIREBASE_API_KEY=' + 'AIza' + 'A'.repeat(35));
    git('add', 'credential.txt');
    assert.equal(scan('--staged').status, 1, 'exception must not apply outside public env files');
    writeFileSync(join(dir, 'credential.txt'), 'redacted');
    writeFileSync(join(dir, '.env.local'), 'PLACEHOLDER=fixture');
    git('add', 'credential.txt', '.env.local');
    assert.equal(scan('--staged').status, 1, 'private env files must never be tracked');
  } finally {
    if (dirname(resolve(dir)) !== resolve(tmpdir())) throw new Error('Unexpected test cleanup location');
    rmSync(dir, { recursive: true, force: true });
  }
});
