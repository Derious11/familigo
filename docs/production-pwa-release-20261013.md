# Production PWA release — October 13, 2026

Scope: installation guidance for iOS/Android, home-screen launch at `/app`, maskable icon, offline app shell, user-controlled updates, login notification opt-in, device-specific registration/status, and notification tap routing. Database rules and unrelated functions are unchanged.

Development installation and push delivery were confirmed by the user on both iOS and Android. PWA/push tests, frontend TypeScript checks, Cloud Functions compilation, production build, and worktree credential scan passed. Production messaging/registration APIs are enabled and the production public VAPID key is configured separately from development.

Firebase production Hosting and `onChallengeCreated`, `onReplyCreated`, and `onMessageCreated` deployed successfully. Hosting version: `e1a5d52824597a68`. The public frontend is Vercel-backed and releases from GitHub `main`; its deployment follows the release push. Production physical-device push testing remains a post-release check.

## Rollback

- Previous Git revision: `44b5a1accbb9b0ec464efb31f691488f69bef27b`.
- Previous Firebase Hosting version: `projects/familigo-11643/sites/familigo-11643/versions/22ca286ff0910ab9`.
- Previous Hosting release: `projects/familigo-11643/sites/familigo-11643/channels/live/releases/1791917542056000`.
- Restore that Firebase Hosting release through release history if required. This does not roll back the public Vercel frontend or Cloud Functions.
- For the public frontend, promote the previous Vercel production deployment or revert the release commit and push to `main`.
- Restore the three notification functions separately from the previous Git source if needed.

Existing installed users should open the app, accept the Update notice, and reload. Devices with existing granted permission register after login; devices without a decision receive an explicit opt-in prompt. Confirm production delivery from another family account with the receiving app in the background.
