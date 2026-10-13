import * as functions from "firebase-functions/v1";
import {db} from "../init";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import {requireAppAdmin} from "../adminAudit";
import {activityId, AchievementState, emptyState} from "./catalog";
import {AchievementEvent, evaluate, fullHouse} from "./engine";

// Explicit admin operation with queries limited to the selected family.
/**
 * Rebuilds bounded family history for an authorized admin operation.
 * @param {string} familyId Selected family circle.
 * @param {boolean} apply Whether to write the quiet backfill.
 * @param {Firestore} store Authorized Firestore instance for this operation.
 * @return {Promise} Reconciliation counts.
 */
export async function reconcileFamilyAchievements(
  familyId: string,
  apply = false,
  store: Firestore = db,
) {
  if (
    typeof familyId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,128}$/.test(familyId)
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Choose a family circle.",
    );
  }
  return store.runTransaction(async (tx) => {
    const circleRef = store.doc(`familyCircles/${familyId}`);
    const family = (await tx.get(circleRef)).data();
    if (!family || family.memberIds.length > 50) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Reconcile circles with at most 50 members.",
      );
    }
    const collections = await Promise.all(
      ["challenges", "replies", "messages", "achievementEvents"].map((name) =>
        tx.get(
          store
            .collection(name)
            .where("familyCircleId", "==", familyId)
            .limit(2000),
        ),
      ),
    );
    if (collections.some((snapshot) => snapshot.size === 2000)) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "History exceeds the beta backfill limit; use a paginated migration.",
      );
    }
    const [challenges, replies, messages, reactions] = collections;
    const events: Record<string, AchievementEvent[]> = {};
    const members: string[] = family.memberIds.filter(
      (id: string) => family.members?.[id] !== false,
    );
    for (const id of members) events[id] = [];
    const add = (id: string, event: AchievementEvent) =>
      events[id]?.push(event);
    const millis = (
      value: FirebaseFirestore.Timestamp | undefined,
    ): number | undefined => value?.toMillis?.();
    let skippedCompletionDates = 0;
    let familyAt: number | undefined;
    for (const doc of challenges.docs) {
      const challenge = doc.data();
      const createdAt = millis(challenge.timestamp);
      if (!createdAt) continue;
      if (challenge.exercise?.name && challenge.target) {
        add(challenge.challenger?.id, {kind: "created", at: createdAt});
      }
      const completed: string[] = Array.from(
        new Set<string>(challenge.completedBy || []),
      );
      for (const id of completed) {
        const at = challenge.completionTimes?.[id];
        // Legacy completedBy establishes completion, but not its date.
        add(id, {
          kind: at ? "completion" : "legacyCompletion",
          at: at || Date.now(),
          category: activityId(challenge.exercise?.name || ""),
        });
        if (!at) skippedCompletionDates++;
        if (completed.filter((id) => members.includes(id)).length >= 2) {
          add(id, {kind: "buddy", at: at || Date.now()});
        }
      }
      if (
        challenge.participationScope === "family" &&
          challenge.participantIds &&
          fullHouse(
            challenge.participantIds,
            challenge.completionTimes || {},
            createdAt,
          )
      ) {
        const at = Math.max(
          ...challenge.participantIds.map(
            (id: string) => challenge.completionTimes[id],
          ),
        );
        familyAt = Math.min(familyAt || at, at);
      }
    }
    const byChallenge = new Map(
      challenges.docs.map((doc) => [doc.id, doc.data()]),
    );
    for (const doc of replies.docs) {
      const reply = doc.data();
      const at = millis(reply.timestamp);
      const challenge = byChallenge.get(reply.challengeId);
      if (!at || !challenge) continue;
      if (reply.contributionValue > 0 && challenge.type === "team") {
        add(reply.user?.id, {kind: "contributions", at});
      }
      if (
        reply.isCompletion === false &&
          reply.text?.trim() &&
          challenge.challenger?.id !== reply.user?.id
      ) {
        add(reply.user?.id, {kind: "comments", at});
      }
    }
    for (const doc of messages.docs) {
      const message = doc.data();
      const at = millis(message.timestamp);
      if (at && message.type === "text" && message.text?.trim()) {
        add(message.senderId, {kind: "messages", at});
      }
    }
    for (const doc of reactions.docs) {
      const reaction = doc.data();
      const reply = replies.docs
        .find((doc) => doc.id === reaction.replyId)
        ?.data();
      if (reply && reply.user?.id !== reaction.actorId &&
          millis(reaction.at)) {
        add(reaction.actorId, {
          kind: "reactions",
          at: reaction.at.toMillis(),
        });
      }
    }
    const profiles = await Promise.all(
      members.map((id) => tx.get(store.doc(`achievementProfiles/${id}`))),
    );
    const familyRef = store.doc(`familyAchievements/${familyId}`);
    const oldFamily = (await tx.get(familyRef)).data();
    let newAwards = 0;
    for (let i = 0; i < members.length; i++) {
      let state = emptyState();
      for (const event of events[members[i]].sort((a, b) => a.at - b.at)) {
        state = evaluate(state, event, true).state;
      }
      const old: AchievementState = profiles[i].data()?.state || emptyState();
      newAwards += Object.keys(state.awards).filter(
        (id) => !old.awards[id],
      ).length;
      state.awards = {...state.awards, ...old.awards};
      if (apply) {
        tx.update(store.doc(`users/${members[i]}`), {
          achievementCount: Object.keys(state.awards).length,
        });
        tx.set(
          profiles[i].ref,
          {familyCircleId: familyId, state},
          {merge: true},
        );
      }
    }
    if (familyAt) {
      const state = evaluate(
        emptyState(),
        {kind: "fullHouse", at: familyAt},
        true,
      ).state;
      state.awards = {...state.awards, ...(oldFamily?.state?.awards || {})};
      if (apply) {
        tx.set(
          familyRef,
          {familyCircleId: familyId, state},
          {merge: true},
        );
      }
    }
    if (apply) {
      // This rebuild already includes these creations. Atomically retire
      // pending receipts so delayed trigger delivery cannot count them twice.
      for (const doc of reactions.docs) {
        const event = doc.data();
        if (event.kind === "created" && !event.processedAt &&
            members.includes(event.actorId) &&
            challenges.docs.some((challenge) =>
              doc.id === `create_${challenge.id}` &&
              challenge.data().challenger?.id === event.actorId &&
              challenge.data().exercise?.name && challenge.data().target)) {
          tx.update(doc.ref, {processedAt: Timestamp.now()});
        }
      }
    }
    return {
      applied: apply,
      members: members.length,
      newAwards,
      skippedCompletionDates,
    };
  });
}

export const reconcileAchievements = functions
  .region("us-central1")
  .runWith({timeoutSeconds: 540})
  .https.onCall(async (data, context) => {
    requireAppAdmin(context);
    return reconcileFamilyAchievements(
      data.familyCircleId, data.apply === true,
    );
  });
