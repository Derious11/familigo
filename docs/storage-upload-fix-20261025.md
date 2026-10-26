# Development photo upload permission fix

The reported adult account belonged to the challenge's family, but uploads were
denied because the Firebase Storage service agent lacked
`roles/firebaserules.firestoreServiceAgent`. The Storage rules read Firestore to
verify membership. The installed Firebase CLI skips its cross-service IAM check
when `--non-interactive` is supplied, so deploying rules did not establish this
prerequisite. Emulator permission tests cannot detect this cloud IAM omission.

Added only that role to the development project's existing Storage service agent,
preserving other bindings with the policy etag. No client or rules relaxation was
needed. A live SDK test verified image upload and download-URL retrieval by a
synthetic member, plus denial of metadata reads by a synthetic outsider. Test
accounts, the object, and fixture documents were cleaned up. No email was sent.

`npm run check:dev-storage` now checks this prerequisite; both development deploy
commands call it before deployment. The checker is read-only unless explicitly
called with `--apply`, and accepts only the development project. Production was
not changed; verify its equivalent prerequisite before the planned rules rollout.

Reference: https://firebase.google.com/docs/rules/manage-deploy
