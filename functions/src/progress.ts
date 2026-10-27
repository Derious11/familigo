import {Timestamp, Transaction} from "firebase-admin/firestore";
import {db} from "./init";

/** Keep legacy history until explicitly archived; migrated profiles retain 90 days. */
export function activityProgress(actor: FirebaseFirestore.DocumentData, now: Timestamp) {
  const day = now.toDate().toISOString().slice(0, 10);
  const cutoff = new Date(now.toMillis() - 89 * 86400000).toISOString().slice(0, 10);
  const activity = Object.fromEntries(Object.entries(actor.activityMap || {})
    .filter(([key]) => actor.progressHistoryVersion !== 1 || key >= cutoff));
  activity[day] = (Number(actor.activityMap?.[day]) || 0) + 1;
  return activity;
}

export function archiveActivity(tx: Transaction, actorId: string, activity: Record<string, unknown>, now: Timestamp) {
  const day = now.toDate().toISOString().slice(0, 10);
  tx.set(db.doc(`users/${actorId}/activityDays/${day}`), {day, count: activity[day], timestamp: now});
}
