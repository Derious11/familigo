# FamiliGo redesign completion plan

Scope: complete the preview experience and verify it against the development project. Existing production entry routes remain unchanged until the redesigned journey is approved for promotion.

## 1. Dialogs
- [x] Shared preview modal styling, focus containment, Escape dismissal, and focus restoration.
- [x] Challenge completion, contribution logging, comments/media, and weight check-ins.
- [x] Profile editing, weight updates, family settings, feedback, and delete confirmation.
- [x] Mobile scrolling and accessible labels; preserve existing service handlers.

## 2. Account states
- [x] Branded onboarding, pending approval, and recoverable errors.
- [x] Review preview routing through authentication and family setup.
- [x] Read-only visual review routes for account states.

## 3. Assets
- [x] Optimize selected W1/I1 and GoGo delivery assets without redesigning them.
- [x] Generate favicon and app-icon sizes; keep production icon references intact.
- [x] Exclude original artwork and exploration assets from the deployment bundle; keep read-only account fixtures gated to development.

## 4. Verification
- [x] Production/development builds, TypeScript check, calendar and secret-check tests.
- [x] Responsive checks, keyboard navigation, validation, and dark/light review.
- [x] Isolated emulator signup, approval, family setup, creation and completion flow.
- [x] Do not use real children or live users for test data; do not send invitations or approval emails during automated checks.
- [x] Record limitations and failures honestly.

## 5. Shared preview and release
- [x] Run security checks before upload; also inspect untracked deliverables because staged checks do not cover them.
- [x] Deploy Hosting only to an expiring development preview channel.
- [x] Verify deployed assets and routes; confirm development backend configuration.
- [x] Save production promotion and rollback instructions.
- [ ] Promote only after the full preview is approved; do not replace live production during preparation.

This checklist is updated as work completes. No commit or push is required for preview publication. Before any later commit, run `node scripts/check-secrets.mjs --staged`; before any later push, run `npm run security:check`.
