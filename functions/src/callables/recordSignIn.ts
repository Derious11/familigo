import * as functions from "firebase-functions/v1";
import {FieldValue, Timestamp} from "firebase-admin/firestore";
import {db} from "../init";

/**
 * Calculate a daily sign-in reward using the shared UTC activity calendar.
 * @param {object} actor Trusted stored profile.
 * @param {Timestamp} now Server time.
 * @return {object|null} Atomic update, or null for an already credited day.
 */
export function signInProgress(
  actor: FirebaseFirestore.DocumentData, now: Timestamp,
) {
  const day = Math.floor(now.toMillis() / 86400000);
  const last = actor.lastActiveDate instanceof Timestamp ?
    Math.floor(actor.lastActiveDate.toMillis() / 86400000) : undefined;
  // Never reward retries or move a future legacy timestamp backwards.
  if (last !== undefined && last >= day) return null;
  const streak = Number.isSafeInteger(actor.streak) && actor.streak > 0 ?
    actor.streak : 0;
  if (last === undefined) return {streak: streak || 1, lastActiveDate: now};
  const consecutive = day - last === 1;
  const previousXp = Number.isFinite(actor.xp) && actor.xp >= 0 ? actor.xp : 0;
  const xp = previousXp + (consecutive ? 10 : 5);
  const dayKey = now.toDate().toISOString().slice(0, 10);
  return {
    streak: consecutive ? streak + 1 : 1,
    lastActiveDate: now,
    xp,
    level: 1 + Math.floor(xp / 500),
    [`activityMap.${dayKey}`]: FieldValue.increment(1),
  };
}

export const recordSignIn = functions.region("us-central1").https.onCall(
  async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Sign in first.");
    }
    // No actor ID, amount, or client timestamp can influence the reward.
    const ref = db.doc(`users/${context.auth.uid}`);
    const now = Timestamp.now();
    return db.runTransaction(async (tx) => {
      const actor = (await tx.get(ref)).data();
      if (!actor) {
        throw new functions.https.HttpsError(
          "not-found", "Profile unavailable.",
        );
      }
      if (actor.role === "child" ||
        !["active", "pending_approval"].includes(actor.status)) {
        throw new functions.https.HttpsError(
          "permission-denied", "Account unavailable.",
        );
      }
      const update = signInProgress(actor, now);
      if (update) tx.update(ref, update);
      return {updated: !!update};
    });
  },
);
