# Phase 2: design consolidation

The default design is consolidated; no marketing/app preview appearance switches remain.

- Replaced `EarlyAccessPreview` and `LoginPreview` with `EarlyAccess` and `Login`. Shared validation and authentication logic lives in `src/hooks` rather than obsolete layouts.
- Removed the old role gate, parent/teen marketing pages, A/B landing layouts, legacy auth flow, and legacy auth page markup. `/parents`, `/teens`, and older landing bookmarks lead to the parent-led homepage; invited users continue using the existing claim-invite process.
- Removed old branches in Feed, Chat, Leaderboard, Profile, onboarding, approval, Header, and challenge creation. Shared dialog styling and focus handling apply consistently. The shared stylesheet is `app.css` and its scope is `app-shell`.
- Replaced remaining legacy avatar and notification icon references; removed obsolete logo, intro GIF, favicon, app-icon, and preview-manifest files.
- Preserved original artwork and concept alternatives under `design-assets`, outside `public`. The asset preparation script uses these sources. Every build now excludes them automatically, so the old preview packaging cleanup script was removed.
- Exact Hosting redirects plus a client fallback keep old URLs useful. The client preserves query strings, fragments, and nested app paths. These files are prepared for production, but only a development Hosting preview is published.
- Removed retired audience pages and non-indexable enrollment from the sitemap.

Verification includes production/development builds, TypeScript, ten redirect/calendar/credential tests, credential scanning, and browser checks of aliases and the consolidated pages/tabs/dialogs. Existing Google sign-in, email delivery, camera/media, real-device, and production-approval requirements from the release handoff still apply.

Archive note: `design-assets/branding-concepts.html` is a local reference board. It is not included in Hosting. Public attachment files and local emulator tooling remain excluded from publication.
