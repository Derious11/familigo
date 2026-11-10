# Home and login startup — November 9, 2026

Both routes now paint build-generated HTML before their React pages mount. Only
the matching preview is activated in the shared SPA/offline HTML; authenticated
routes and other public pages receive neither preview. The interactive pages
supply the preview markup and styles. The login preview stops before the form,
so typing cannot be lost when React mounts. Login itself restores Firebase Auth
without starting Firestore, Storage, or private app listeners. New Google accounts
still write their pending profile before navigating. Google Analytics and PostHog
initialize after content has had a chance to paint; queued SDK calls retain order.
The PWA keeps its existing background precache policy.

## Incremental local measurements

One cold sample per changed route per stage, local Chrome, mobile 390×844,
4× CPU slowdown, 150 ms latency, 1.6 Mbps download, service workers blocked.
Values are LCP seconds, not time until authentication finishes.

| Build | Home | Login |
|---|---:|---:|
| Baseline | 11.372 | 8.432 |
| HTML home heading and styles | 1.340 | — |
| Separate login entry and Auth initialization | — | 7.180 |
| Defer analytics | 1.280 | 3.496 |
| Generate both previews from existing components | 2.196 | 0.960 |

Stages isolate implementation batches; single local samples are directional.

## Hosted Firebase development comparison

Same throttled browser protocol as the earlier November 9 benchmark. Each value
is the median of three runs. Cold contexts were fresh; repeat visits reused them.

| Page | Baseline cold | Final cold | Baseline repeat | Final repeat |
|---|---:|---:|---:|---:|
| Home | 10.284 s | 2.136 s | 1.812 s | 0.556 s |
| Login | 10.404 s | 1.392 s | 2.680 s | 0.680 s |

Final cold ranges: home 1.920–2.476 s; login 1.232–1.428 s. Maximum measured
CLS was zero across all 12 visits, with no page errors or horizontal overflow.
Raw hosted results: local artifacts nov09-repeat-browser.json (before) and
nov09-startup-final-browser.json (after). Real-user LCP and INP remain unmeasured.

## Verification

- TypeScript and development build passed; 15 legacy-routing/PWA/push tests passed.
- Isolated Firebase emulator: email login; previously signed-in visitor returning
  to login; invite-code preservation; cancelled popup stays on login; successful
  Google emulator popup creates pending profile before returning to the app.
  The existing mobile/desktop accessibility and recovery journeys passed.
- Hosted dev HTML matched dist. With application JavaScript held, both headings
  appeared and FAQ did not display either preview. Releasing JavaScript preserved
  an early mobile menu click. Signed-out login reached enabled controls without
  requesting the private app chunk, Firebase services config, Firestore endpoint,
  or intro video. Repeat with node scripts/test-public-startup.mjs after a dev deploy.
- Development Hosting only; no production or database changes. Before promotion,
  retest the real Google provider on iPhone/Android and the installed PWA update.
