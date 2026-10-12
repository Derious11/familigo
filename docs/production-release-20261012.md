# Production release — October 12, 2026

Project: `familigo-11643`. User approved production deployment after PC and phone testing.

Release includes the consolidated frontend, family-bootstrap/access rules tested in development, and only the `onUserStatusChanged` approval-email function. The email button points to `https://www.familigo.life/login` and reads “Log In to FamiliGo”. No test emails or new accounts are created during release verification.

Production build, TypeScript, and worktree credential scan passed. Production preview backend, entry routes, brand asset, and intro video were checked before promotion.

Rollback: previous Hosting version `7be641200abc6113` was cloned to `pre-redesign-20261012`. Use `firebase hosting:clone familigo-11643:pre-redesign-20261012 familigo-11643:live --project familigo-11643` if rollback is required. Previous ruleset metadata is in `production-release-20261012.json`; the exact previous rule source is saved locally at `.test-artifacts/production-firestore-before-20261012.rules`. Restore rules separately from Hosting if necessary.

Candidate: `production-review-20261012`. The runtime project was checked to be production, with no development project reference.

## Deployment outcome

Production Firestore rules and `onUserStatusChanged(us-central1)` deployed successfully. The verified Hosting candidate was cloned to live successfully. `https://familigo-11643.web.app` serves the new bundle `index-CcUMEa3j.js`.

The public custom domain is not yet updated: `familigo.life` and `www.familigo.life` respond through Cloudflare with the older `index-DXh37WBq.js` bundle. Browser review of the public `/login` confirms the old landing/login experience. The Firebase site's custom-domain listing returned no mappings. Do not claim the public-domain release is complete until its deployment path is identified and updated.

Accessing the Cloudflare dashboard was rejected by automatic approval review because explicit administrative-account authorization is missing. No Cloudflare settings were changed. User authorization and the hosting project/deployment method are required to finish that portion of the release.

The user subsequently confirmed that Vercel hosts the public site and automatically deploys Git pushes. The release therefore uses the existing GitHub `main` deployment integration; no Cloudflare dashboard access or DNS changes are needed. Vercel redirects mirror the Firebase aliases, and production builds reject the development Firebase project. Before this release, GitHub main was `75ea7aa`. Public-domain verification follows the push. Firebase Hosting rollback does not roll back Vercel: use Vercel's previous production deployment or revert the release Git commit for that frontend.

Firebase reported that the existing Node.js 20 function runtime needs an upgrade before its October 30, 2026 deployment cutoff. This release retains the tested runtime; schedule that upgrade separately.
