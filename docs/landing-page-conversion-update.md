# Landing page conversion update

## Plan

1. Audit the supplied messaging review against the current landing page, signup,
   FAQ, analytics, and product implementation.
2. Preserve the existing wordmark, GoGo, colors, layout, and parent-led beta flow.
   Lead with family fitness challenges, friendly competition, private family
   leaderboards, and teamwork. Use “Request Free Beta Access” for the primary CTA.
3. Add genuine product evidence with synthetic demo data and explicit achievement
   preview labels until the new achievement release is confirmed deployed.
4. Align the FAQ and registration journey, make family details optional, preserve
   approval gating, and put the admin invitation field behind a disclosure.
5. Update SEO and social metadata, remove the redirected teens sitemap URL, and
   extend the existing PostHog funnel with explicit CTA and registration events.
6. Validate build/types, achievement claims, desktop/mobile layout, navigation,
   FAQ interactions, registration validation, and invitation prefilling. Save
   screenshots for review.

## Implemented

- Hero: “Turn family fitness into a friendly competition.”
- Gameplay loop and competitive walking, squat, and jumping-jack examples.
- Separate parent, kid/teen, and whole-family benefit copy.
- Real challenge, pinned achievement, and unlock screens, with provenance in
   `public/assets/brand/product/README.md`. Achievement availability is explicitly
   a preview, not a promise of an already deployed release.
- Landing FAQ and standalone FAQ now accurately explain competition, teamwork,
   mobile web access, free closed beta, and approval. Visible standalone answers
   and FAQ structured data share one source.
- Parent name, email, and password remain required. Family details are optional
   and collapsed. Omitted values are not submitted as invented kid counts or ages.
   Invitation URLs continue to prefill and expose the optional invitation field.
- Base HTML and runtime landing title/description/social metadata agree.
- `/teens`, which redirects to `/`, is removed from the sitemap.
- `beta_signup_clicked` records `placement`, `source`, and `destination` on landing
   CTAs. `beta_registration_submitted` records successful authentication/profile
   creation by `method` and `has_invite`, before invitation redemption. Neither
   event contains form values, child ages, email addresses, or invitation codes.
   Existing route views and family creation events remain available.

## Scope and follow-up

This change updates the local checkout; it does not deploy the app. The checkout
already contains separate achievement/backend changes, which were preserved.

Before the next production release, confirm achievement availability and replace
preview language accordingly. A fresh leaderboard capture should use the same
synthetic family; the current evidence section uses verified existing captures.
No fabricated testimonials, customer counts, or premium availability were added.
FamiliGo+ remains a later marketing decision.

Use the existing route event plus the new CTA/registration events to evaluate the
acquisition funnel. Approval, first completion, and second-member participation
need separately defined activation reporting; this marketing change does not
claim to implement a complete backend funnel.

The public pages remain client-rendered. Initial social metadata is corrected,
but Search Console rendered-page indexing needs account access and should be
checked before choosing a prerendering solution.

## Validation

- `npx tsc --noEmit`: passed.
- `npm run build`: passed (existing bundle-size and browser-data warnings).
- `npm run test:achievements`: all 16 tests passed, covering the catalog,
  completion milestones, weekly streaks, reactions, family awards, and pin rules.
- `node scripts/check-secrets.mjs --worktree`: passed; values were not printed.
- `git diff --check`: passed.
- Browser: 320, 390, 768, and 1440 px layouts had no horizontal overflow;
  loaded landing images had no failures. Checked mobile menu open/Escape close,
  CTA navigation, empty signup validation without child-count errors, invalid
  optional child-count validation, invitation URL prefill, and FAQ search/expand.
- No live signup was submitted. The existing local preview uses development
  Firebase, so validation was limited to navigation and client-side validation.
- Screenshots are saved in `artifacts/marketing/landing-review/`: desktop hero,
  mobile hero, product evidence, mobile signup, and mobile FAQ.
