# Development environment

Firebase project: familigo-dev-11643 (FamiliGo Development)
App: https://familigo-dev-11643.web.app
Console: https://console.firebase.google.com/project/familigo-dev-11643/overview

## Commands

- npm run dev: local Vite app using the development Firebase project.
- npm run build:dev: development build in dist.
- npm run deploy:dev: rebuild for development and deploy hosting, Firestore rules/indexes, authentication, Storage rules, and Cloud Functions explicitly to familigo-dev-11643.
- npm run build: production build using the existing familigo-11643 project.
- npm run deploy:dev:functions: compile and deploy all development Cloud Functions (requires the development Storage bucket).
- npm run deploy:dev:storage: deploy the development Storage rules.

The deploy:dev command rebuilds first so a previous production build cannot be accidentally published to development. The default Firebase CLI project remains production; use explicit --project flags for all other deployments.

## Provisioned

- Separate Firebase project and web app.
- Empty Firestore Standard database in nam5, matching production.
- Existing repository Firestore rules deployed.
- Three composite indexes for challenges, messages, and replies match production definitions.
- Google and email/password authentication, with localhost and the development hosting domains authorized.
- Firebase Hosting with noindex headers.
- Client and notification service worker use the same environment configuration.
- Blaze billing and required Cloud Functions APIs are enabled.
- Development Storage bucket is created and the repository Storage rules are deployed.
- Nine Cloud Functions are deployed: onChallengeCreated, onReplyCreated, onMessageCreated, onUserStatusChanged, sendTeenInviteEmail, validateTeenInvite, joinFamily, redeemTeenInvite, and generateThumbnail. The thumbnail trigger uses the development Storage bucket.
- Development function builds use Node.js 22, with a seven-day build-artifact cleanup policy.
- Callable smoke checks verified input validation and authentication enforcement without writing data or sending email.

## Remaining setup

- Development function deployment uses Node.js 22 and compiles before deployment. Email delivery is disabled through an empty RESEND_API_KEY in the ignored functions/.env.familigo-dev-11643 file. Configure a separate development key when email testing is needed; production credentials were not copied.
- Cloud Functions email links and notification asset URLs resolve from the runtime project, so development links use the development host.
- Configure the development Web Push certificate public key in VITE_FIREBASE_VAPID_KEY. Until then the app reports that push is not configured.
- Create development users and any required admin claims or reference data separately. Production users/data were not copied. New signups use the existing pending-approval workflow.
- Review any .env.local analytics and AI settings before testing third-party features; Vite uses these for both modes.

Firebase web configuration in .env.development and .env.production is public client metadata, not server credentials. Keep server secrets in ignored local files or Firebase Secret Manager.
