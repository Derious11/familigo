# Development device checks

Target: https://familigo-dev-11643.web.app
Application revision: `0abd6e9` (after deployment confirmation).
Use development accounts/content. Record phone model, OS/browser version,
installed-PWA versus browser, pass/fail, and reproduction steps for failures.

Run on both iPhone Safari and Android Chrome:

1. Open the home, login, FAQ, privacy and enrollment pages. Check readable text,
   portrait/landscape layout, dark mode, keyboard focus and form errors.
2. Sign in with email and, with an existing development Google account, OAuth.
   Confirm returning from the provider reaches the correct family. Sign out and
   confirm private content disappears; sign back in.
3. Open chat, load older messages, and confirm the same message stays in view.
   Send one test message. Toggle airplane mode with a draft, reconnect, and confirm
   the draft survives and can be sent once. Check the on-screen keyboard.
4. Create a test challenge and reply with text/photo; check upload errors and retry.
   Delete your own test challenge and confirm its replies disappear. Switch tabs
   and families/profiles; check for stale content or permission errors.
5. Open History and load older entries. Check Profile, achievements and Adventures.
   Open and close dialogs; check scrolling afterward. Report any stuck scrolling
   (a separate modal fix remains outside this checkpoint).
6. Install to the home screen. Launch while online, then offline, reconnect and
   verify recovery. Keep an unsent draft while closing/reopening the app.
7. Check a notification link only with an approved development test notification.
   Report whether it opens the intended family/screen. Invitation email delivery
   and notification sending need an explicitly approved recipient/test action;
   automated review has not sent external messages.

PWA update recovery needs a second development release while the old version is
open; initial installation alone does not cover the update gate. Physical checks
do not replace field INP or repeated controlled performance comparisons.
