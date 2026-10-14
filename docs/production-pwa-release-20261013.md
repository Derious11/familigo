# Production PWA release — October 13, 2026

Scope: installation guidance for iOS/Android, home-screen launch at `/app`, maskable icon, offline app shell, user-controlled updates, login notification opt-in, device-specific registration/status, and notification tap routing. Database rules and unrelated functions are unchanged.

Development installation and push delivery were confirmed by the user on both iOS and Android. PWA/push tests, frontend TypeScript checks, Cloud Functions compilation, production build, and worktree credential scan passed. Production messaging/registration APIs are enabled and the production public VAPID key is configured separately from development.

Firebase production Hosting and `onChallengeCreated`, `onReplyCreated`, and `onMessageCreated` deployed successfully. Final Hosting version: `4553f3726c49bf3f`. The public frontend released on Vercel after pushing commit `12559c3` to GitHub `main`.

Public-domain checks verified `/app`, production public push configuration, the login opt-in prompt, standalone manifest with `/app` launch, all install icons, and the versioned worker precaching the current bundle (`index-Cfp7EpEr.js`). Cloudflare overrides the worker's origin cache header to a four-hour TTL; registration versions the worker URL by app bundle path, and the versioned URL was verified to serve the new production worker. No Cloudflare settings were changed. Eleven PWA/push tests passed. Production physical-device push testing remains a post-release check.

## Rollback

- Previous Git revision: `44b5a1accbb9b0ec464efb31f691488f69bef27b`.
- Previous Firebase Hosting version: `projects/familigo-11643/sites/familigo-11643/versions/22ca286ff0910ab9`.
- Previous Hosting release: `projects/familigo-11643/sites/familigo-11643/channels/live/releases/1791917542056000`.
- Restore that Firebase Hosting release through release history if required. This does not roll back the public Vercel frontend or Cloud Functions.
- For the public frontend, promote the previous Vercel production deployment or revert the release commit and push to `main`.
- Restore the three notification functions separately from the previous Git source if needed.

Existing installed users should open the app, accept the Update notice, and reload. Devices with existing granted permission register after login; devices without a decision receive an explicit opt-in prompt. Confirm production delivery from another family account with the receiving app in the background.
