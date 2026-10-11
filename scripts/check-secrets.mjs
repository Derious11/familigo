import { execFileSync } from 'node:child_process';

// Read the index for commits, or a named tree for CI. Never print credential values.
const staged = process.argv.includes('--staged');
const refOption = process.argv.indexOf('--ref');
const ref = staged ? null : (refOption >= 0 ? process.argv[refOption + 1] : 'HEAD');
if (!staged && !ref) throw new Error('--ref requires a Git revision');
const files = execFileSync('git', staged
  ? ['ls-files', '-z']
  : ['ls-tree', '-r', '--name-only', '-z', ref], { encoding: 'utf8' }).split('\0').filter(Boolean);
const patterns = [
  /\bre_[A-Za-z0-9_]{20,}\b/,
  /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/,
  /\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}\b/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bsk-[A-Za-z0-9_-]{24,}\b/,
];
let failed = false;
for (const file of files) {
  if (/(^|\/)\.env(?:$|\.)/.test(file) && !['.env.development', '.env.production'].includes(file) && !file.endsWith('.example')) {
    console.error(`${file}: private environment files must not be tracked`);
    failed = true;
  }
  const content = execFileSync('git', ['show', staged ? `:${file}` : `${ref}:${file}`], { maxBuffer: 64 * 1024 * 1024 });
  if (content.includes(0)) continue;
  content.toString('utf8').split(/\r?\n/).forEach((line, index) => {
    // Firebase browser keys are intentionally public. Other Google keys are blocked.
    const firebasePublic = ['.env.development', '.env.production'].includes(file)
      && /^(?:VITE_FIREBASE_API_KEY)\s*=\s*AIza[\w-]{35}\s*$/.test(line);
    const googleKey = /\bAIza[\w-]{35}\b/.test(line) && !firebasePublic;
    const assignedSecret = /^\s*(?:export\s+)?(?:[A-Z_]*(?:SECRET|TOKEN|PASSWORD)|RESEND_API_KEY|GEMINI_API_KEY|OPENAI_API_KEY)\s*=\s*["']?[^\s"']{12,}/.test(line)
      && !/\b(?:example|placeholder|your[_-]|replace[_-])\b/i.test(line);
    if (patterns.some(pattern => pattern.test(line)) || googleKey || assignedSecret) {
      console.error(`${file}:${index + 1}: possible secret credential (value redacted)`);
      failed = true;
    }
  });
}
if (failed) process.exit(1);
console.log('Secret credential check passed.');
