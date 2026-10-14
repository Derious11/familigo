# FamiliGo PWA

The installed app starts at `/app`. Dashboard installation prompts are hidden in standalone/native mode and dismissed for 30 days. Profile settings always provides installation help when the web app is not installed.

On iPhone/iPad, installation help opens in a focus-trapped modal: Safari → Share → Add to Home Screen → Add. Keep “Open as Web App” enabled if offered. Embedded browsers get instructions for opening Safari. Android uses `beforeinstallprompt` when available and browser-menu instructions otherwise.

## Loading and releases

Production and development builds bundle Firebase Messaging with the PWA worker at the existing `/firebase-messaging-sw.js` URL. No external worker imports are needed for an offline start. The build fingerprints public configuration, the worker, manifest, and static shell assets. Installation precaches only those assets, never Firestore responses, uploads, or authentication responses.

The worker serves a consistent release's HTML and assets. A new worker waits for the user to choose Update and confirm a reload. Unsent drafts must be finished before updating. The previous release's cache remains available for other open tabs. No automatic reload occurs on reconnect or notification taps.

The offline screen hides the current UI without unmounting it, preserving in-memory drafts. Activities and chat require internet. This release does not persist drafts across app termination or support offline submission/sync.

The Vite development server does not register a worker; test workers using a built app over HTTPS or localhost. Use `npm run build:dev`, then `npm run preview -- --host 127.0.0.1`.

## Notifications

After login, supported devices without a permission decision see an opt-in modal. Only tapping Enable notifications requests browser permission. Maybe later dismisses the prompt for the current logged-in session. Devices with granted permission refresh their token after login, unless this installation was explicitly opted out in Profile. Profile reports this device's registration status; disabling it preserves other devices' tokens. iOS web push requires launching the installed home screen app (iOS/iPadOS 16.4+). Unsupported browsers can still load the app. Firebase's automatic display handles notification payloads; the worker displays only data-only background payloads to avoid duplicates. Notification taps open the feed or chat and accept only same-origin `/app` destinations.

Both Hosting and the notification Cloud Functions must be deployed for the new notification links and icon to apply. Keep VAPID public configuration available in each environment and server credentials in server secrets.

The public `www.familigo.life` frontend runs on Vercel and deploys automatically from GitHub `main`. Firebase Hosting serves the separate `familigo-11643.web.app` URL. Both Hosting configurations set revalidation headers for the worker, manifest, and HTML. Worker registration includes the app bundle path as a version query so a new release bypasses any previously cached worker response at the edge. Verify the public domain after pushing; a Firebase Hosting release alone does not update it.

Both development and production have their own public `VITE_FIREBASE_VAPID_KEY` configured. Obtain replacement public keys from Firebase Console → Project settings → Cloud Messaging → Web Push certificates, then rebuild and redeploy Hosting. No private keys should be copied into browser configuration or between projects.

## Release checks

- Run `npm run test:pwa`, `npx tsc --noEmit`, `npm --prefix functions run build`, and `npm run build:dev`.
- On a real iPhone: install from Safari, launch standalone, sign in, close/reopen, check keyboard and safe areas, and enable notifications from Profile.
- On Android Chrome: use the native installation prompt and confirm launcher icon/standalone launch.
- Load online, enable airplane mode, relaunch, verify the offline screen, and reconnect without losing an open draft.
- Deploy another build while the app is open; verify the Update notice, cancel it while editing, then confirm the reload after finishing.
- Test foreground/background notifications and taps with the app both open and closed; chat notifications should open chat.
- Review the development deployment before production. Physical-device checks and real push delivery cannot be replaced by desktop browser tests.
