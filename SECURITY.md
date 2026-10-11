# Credentials

Git hooks block common private credential formats and tracked private environment files. Run `npm install` to enable hooks in a new checkout. Run `npm run security:check` before a commit or push. GitHub Actions repeats the check after these files are pushed; require the `secrets` check in branch protection to enforce it for merges. Pattern checks reduce risk but cannot recognize every possible secret.

Firebase browser API keys are public configuration. Restrict them to the necessary APIs and protect data with Firebase Security Rules and App Check. Other API keys must remain on the server.

## Existing Resend exposure

`RESEND_API_KEY` was committed in `functions/.env.familigo-11643` in commit `5815ebce` on the recorded remote main history. The current tree excludes that file, but the old commit remains accessible.

1. Revoke the exposed key in Resend and create a replacement with the minimum necessary permissions. Do not paste its value into chat.
2. Store the replacement in Firebase Secret Manager with `firebase functions:secrets:set RESEND_API_KEY --project familigo-11643`. The email functions bind this secret explicitly; keep it out of `.env` files. Redeploy `sendTeenInviteEmail` and `onUserStatusChanged`, then verify email delivery. Revocation may interrupt email until the replacement is deployed.
3. Remove `functions/.env.familigo-11643` from all published Git history using git-filter-repo in a fresh mirror clone, then force-push the cleaned refs after coordinating with collaborators. Make collaborators clone the cleaned repository again. Ask GitHub to remove cached views of sensitive commits if needed. Existing clones may retain the old key, so rotation is essential.

The replacement is stored in production and development Secret Manager, and both projects' email functions use it. Email delivery was confirmed and the old `familigo_welcome` key was revoked. Git history cleanup remains outstanding.
