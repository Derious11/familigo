# Credential protection

- Never print, commit, push, or embed private credentials in browser code.
- Keep Resend, Gemini, and other server API keys in server-side secret storage or ignored local environment files. Firebase browser configuration is public and is allowed in `.env.development` and `.env.production` only.
- Before committing, run `node scripts/check-secrets.mjs --staged`. Before pushing, run `npm run security:check`.
- Never bypass the secret checks. Report suspected exposure using only the variable name, file, and commit; redact values.
- A leaked key must be revoked at its provider. Removing it from the current tree or Git history does not revoke it.
