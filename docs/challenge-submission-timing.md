# Challenge submission timing — November 9, 2026

Development function logs showed intermittent multi-second execution on both
write paths (up to 4.21 s for posting and 4.29 s for replies in the inspected
sample), interleaved with substantially faster requests. Log duration alone
does not identify which individual requests ran on new instances.

The new challenge, completion, team activity and weight dialogs now send an
authenticated, read-only preparation request to the actual callable when opened.
At most one attempt per callable per four minutes per browser tab; no timers,
minimum instances or writes on open. On the first preparation in a server
instance a field-projected Firestore read initializes the connection. Saves
never depend on preparation succeeding. Completion also batches challenge and
receipt reads, and loads eligible buddy records together within the transaction.

One real SDK run after deployment to familigo-dev-11643:

| Action | Preparation on dialog intent | Subsequent committed write |
|---|---:|---:|
| Post challenge | 4,735 ms | 576 ms |
| Complete with text | 3,305 ms | 433 ms |

These are client-observed callable timings in a synthetic family, sequenced so
preparation finished before the write. They are not tap-to-paint measurements
or guaranteed latency: immediate submission may still encounter startup, and a
photo must upload before completion. No production configuration changed.
The repeated completion awarded XP once; the synthetic records were removed.
Frontend type check, frontend/backend builds, 23 achievement integration checks
and the mobile/desktop browser recovery journeys passed.
