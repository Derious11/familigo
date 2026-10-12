# Redesign verification and release handoff

Reviewed 2026-10-11. Production has not been deployed or promoted.

## Shared preview

https://familigo-dev-11643--redesign-review-re4iwe2d.web.app/landing-v2

Channel expires October 18, 2026. Other review routes are `/early-access-v2?role=parent`, `/login-v2`, `/app-preview` (requires development account access), and `/design-review` (read-only account states). The published runtime configuration was verified to use `familigo-dev-11643`. Optimized wordmark, icon, challenge image, and preview manifest returned successful responses with expected content types.

## Completed

- Shared modal styling for profile, weight, completion, contribution, family settings, feedback, and deletion confirmation. Preview dialogs contain focus, restore focus, support Escape, and scroll on small screens. Added missing form labels.
- Branded onboarding, approval, and recovery screens. Preview login and onboarding preserve the app preview destination. Pending accounts remain behind approval before family setup.
- Approved W1/I1 branding and GoGo artwork optimized into WebP and sized icons. Original artwork and branding exploration pages are excluded from preview output. Production icon references remain unchanged.
- Challenge celebration fires after a successful completion save and respects reduced-motion preferences.
- Family creation now writes the circle and user association atomically. Narrow rules allow only approved adults to bootstrap their own circle without role or approval escalation. Challenge reads are restricted to the family or trusted administrators.

## Validation

- Production, development, and packaged preview builds passed; TypeScript passed.
- Six calendar and credential-scanner tests passed.
- Ten isolated Firebase emulator journey and access-control checks passed using synthetic accounts in `demo-familigo-redesign`. These exercise real frontend service methods, signup, pending approval, approved family creation, solo completion, team contribution, repeat login, and forbidden escalation/access cases.
- Browser review covered mobile and desktop layouts, light/dark presentation, dialog dismissal/focus restoration, and read-only account states. Latest mobile checks included completion, edit profile, weight, family settings, and feedback. No live form saves, invitations, profile edits, or deletions were performed for these visual checks.
- Staged, history/security, and worktree credential scans passed. Worktree scanning includes untracked nonignored source.
- Development Firestore rules were compiled and deployed to `familigo-dev-11643`. No production rules, Hosting, Functions, or other production resources were deployed.
- Shared Hosting preview deployed successfully; landing, parent enrollment, and login routes were verified in the browser.

## Remaining manual checks before production

Google sign-in and actual approval/invitation email delivery were not exercised. Camera/microphone permissions and media uploads were not exercised. Test these with consenting adult development accounts before release. Real-device usability and field performance measurements remain necessary; builds still report large JavaScript chunks, so successful compilation is not evidence of meeting Core Web Vitals targets. The focused rules audit is not a full application security certification.

## Promotion and rollback

1. Review the shared preview and complete the manual checks above.
2. After approval, map the redesigned landing, enrollment, login, and app experience to the intended public entry routes. Replace preview path references/canonical metadata and remove preview-only `noindex` where appropriate. Keep `/design-review` unavailable in production.
3. Rebuild using production configuration. Never copy the development preview bundle directly into production: its Firebase runtime points to the development project.
4. Run `node scripts/check-secrets.mjs --staged` before committing, `npm run security:check` before pushing, and the worktree check before uploading. Stage explicit source/assets; exclude private attachments and local test tooling.
5. Record the currently released production Hosting version and rules before deployment. Validate the production-configured build on a preview channel first, then release the tested rules and Hosting version to the explicitly selected production project.
6. Roll back Hosting using the previous version in Firebase Hosting release history if needed. Restore the recorded previous rules separately and redeploy rules; a Hosting rollback does not restore Firestore rules. Recheck signup, family creation, and challenge access after either direction of release.

No commit or push was performed for this preview publication.
