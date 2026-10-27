import {activityProgress, archiveActivity} from '../progress';
import * as functions from "firebase-functions/v1";
import {FieldValue, Timestamp, Transaction} from "firebase-admin/firestore";
import {db} from "../init";
import {AchievementState, activityId, BADGES, emptyState} from "./catalog";
import {AchievementEvent, evaluate, fullHouse, validPins} from "./engine";

const callable = functions.region("us-central1").https;
/**
 * Rejects malformed activity input.
 * @param {string} message Validation failure description.
 */
function fail(message: string): never {
  throw new functions.https.HttpsError("invalid-argument", message);
}
const identifier = (value: unknown): string =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value) ?
    value :
    fail("Invalid identifier.");
const text = (value: unknown, max = 2000): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
type Data = FirebaseFirestore.DocumentData;

/**
 * Checks family membership and parent-managed child identity.
 * @param {string} uid Authenticated caller.
 * @param {string} actorId Profile taking the action.
 * @param {Data} actor Trusted user data.
 * @param {string} familyId Selected circle.
 * @param {Data} family Trusted family data.
 * @return {boolean} Whether the caller may act as this profile.
 */
export function canAct(
  uid: string,
  actorId: string,
  actor: Data,
  familyId: string,
  family: Data,
): boolean {
  const enrolled =
    family.memberIds?.includes(actorId) && family.members?.[actorId] !== false;
  return (
    !!enrolled &&
    actor.familyCircleId === familyId &&
    (actor.status === "active" || (actor.role === "child" && !actor.status)) &&
    (uid === actorId ||
      (actor.role === "child" &&
        actor.parentId === uid &&
        family.memberIds.includes(uid) &&
        family.members?.[uid] !== false))
  );
}
/**
 * Loads trusted records before transaction writes.
 * @param {Transaction} tx Current transaction.
 * @param {string} uid Authenticated caller.
 * @param {string} actorId Acting profile.
 * @param {string} familyId Selected circle.
 * @return {Promise} Trusted actor and family data.
 */
async function authorize(
  tx: Transaction,
  uid: string | undefined,
  actorId: string,
  familyId: string,
) {
  if (!uid) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in first.");
  }
  const [actorDoc, familyDoc] = await Promise.all([
    tx.get(db.doc(`users/${actorId}`)),
    tx.get(db.doc(`familyCircles/${familyId}`)),
  ]);
  const actor = actorDoc.data();
  const family = familyDoc.data();
  if (!actor || !family || !canAct(uid, actorId, actor, familyId, family)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Active family membership required.",
    );
  }
  if (uid !== actorId) {
    const parent = (await tx.get(db.doc(`users/${uid}`))).data();
    if (!parent || parent.status !== "active" || parent.role !== "adult" ||
      parent.familyCircleId !== familyId) {
      throw new functions.https.HttpsError("permission-denied",
        "An active parent must manage this child.");
    }
  }
  return {actor, family};
}
interface Prepared {
  id: string;
  familyId: string;
  actor: Data;
  state: AchievementState;
  unlocked: string[];
  family?: boolean;
}
/**
 * Evaluates events against persisted aggregate progress.
 * @param {Transaction} tx Current transaction.
 * @param {string} id Profile or family ID.
 * @param {string} familyId Selected circle.
 * @param {Data} actor Trusted user data.
 * @param {Array} events Validated activity events.
 * @param {boolean} historical Whether awards should be quiet.
 * @param {boolean} family Whether this is a family achievement.
 * @return {Promise} Prepared state and new awards.
 */
async function prepare(
  tx: Transaction,
  id: string,
  familyId: string,
  actor: Data,
  events: AchievementEvent[],
  historical = false,
  family = false,
): Promise<Prepared> {
  const snapshot = await tx.get(
    db.doc(`${family ? "familyAchievements" : "achievementProfiles"}/${id}`),
  );
  let state: AchievementState = snapshot.data()?.state || emptyState();
  const unlocked: string[] = [];
  for (const event of events) {
    const result = evaluate(state, event, historical);
    state = result.state;
    unlocked.push(...result.unlocked);
  }
  return {id, familyId, actor, state, unlocked, family};
}
/**
 * Commits awards and unique announcements in the activity transaction.
 * @param {Transaction} tx Current transaction.
 * @param {Prepared} prepared Evaluated achievement changes.
 * @param {boolean} historical Whether announcements should be suppressed.
 */
function persist(tx: Transaction, prepared: Prepared, historical = false) {
  const {id, familyId, actor, state, unlocked, family} = prepared;
  tx.set(
    db.doc(`${family ? "familyAchievements" : "achievementProfiles"}/${id}`),
    {familyCircleId: familyId, state},
    {merge: true},
  );
  if (!family) {
    tx.update(db.doc(`users/${id}`), {
      achievementCount: Object.keys(state.awards).length,
    });
  }
  if (historical || actor.shareAchievements === false) return;
  for (const badgeId of unlocked) {
    const badge = BADGES.find((item) => item.id === badgeId);
    if (!badge) continue;
    const scope = family ? "family" : "user";
    const messageId = `achievement_${scope}_${id}_${badgeId}`;
    tx.create(db.doc(`messages/${messageId}`), {
      familyCircleId: familyId,
      senderId: family ? "" : id,
      senderName: family ? "Your family" : actor.name,
      type: "achievement",
      badgeId,
      text: family ?
        "Everyone in the shared challenge completed their part!" :
        badge.description,
      timestamp: Timestamp.now(),
    });
    tx.update(db.doc(`familyCircles/${familyId}`), {
      messageCount: FieldValue.increment(1),
    });
  }
}

export const recordChallenge = callable.onCall(async (data, context) => {
  const actorId = identifier(data.actorId);
  const familyId = identifier(data.familyCircleId);
  const id = identifier(data.requestId);
  return db.runTransaction(async (tx) => {
    const {actor, family} = await authorize(
      tx,
      context.auth?.uid,
      actorId,
      familyId,
    );
    const ref = db.doc(`challenges/${id}`);
    const receipt = db.doc(`achievementEvents/create_${id}`);
    const [existing, recorded] = await Promise.all([
      tx.get(ref), tx.get(receipt),
    ]);
    if (recorded.exists) {
      if (recorded.data()?.actorId &&
        (recorded.data()?.actorId !== actorId ||
          recorded.data()?.familyCircleId !== familyId)) {
        fail("Challenge identifier already used.");
      }
      return {id};
    }
    if (existing.exists) fail("Challenge identifier already used.");
    const exerciseName = text(data.exercise?.name, 100);
    if (!exerciseName || !text(data.target, 500)) {
      fail("Choose an activity and target.");
    }
    const duration = Number(data.durationDays ?? 2);
    if (!Number.isInteger(duration) || duration < 1 || duration > 14) {
      fail("Challenge duration must be 1–14 days.");
    }
    if (!["individual", "team"].includes(data.type)) {
      fail("Invalid challenge type.");
    }
    if (
      data.type === "team" &&
      (!Number.isFinite(data.goalTotal) ||
        data.goalTotal <= 0 ||
        data.goalTotal > 100000)
    ) {
      fail("Invalid team goal.");
    }
    // All members can participate. Keep the posting-time family snapshot only
    // for Full House; client-supplied participant selections are ignored.
    const participants: string[] = Array.from(new Set<string>(family.memberIds))
      .filter((id) => family.members?.[id] !== false);
    if (!participants.length || participants.length > 50) {
      fail("A challenge requires a family with 1–50 members.");
    }
    const now = Timestamp.now();
    tx.create(ref, {
      challenger: {id: actorId, name: actor.name},
      familyCircleId: familyId,
      exercise: {
        name: exerciseName,
        description: text(data.exercise?.description),
        visualGuideUrl: text(data.exercise?.visualGuideUrl, 1000),
      },
      target: text(data.target, 500),
      type: data.type,
      mediaUrl: text(data.mediaUrl, 2000),
      timestamp: now,
      expiresAt: Timestamp.fromMillis(now.toMillis() + duration * 86400000),
      participantIds: participants,
      participationScope: "family",
      completionTimes: {},
      completedBy: [],
      ...(data.type === "team" ?
        {
          goalTotal: data.goalTotal,
          currentTotal: 0,
          unit: text(data.unit, 50),
        } :
        {}),
    });
    // Durable outbox: posting waits only for the challenge and this receipt.
    // The retry-enabled trigger commits badges and announcements separately.
    tx.create(receipt, {
      kind: "created", actorId, familyCircleId: familyId, at: now,
    });
    return {id};
  });
});

export const achievementChallengeCreated = functions
  .region("us-central1")
  .runWith({failurePolicy: true})
  .firestore.document("achievementEvents/{id}")
  .onCreate(async (snapshot) => {
    if (snapshot.data().kind !== "created") return;
    await db.runTransaction(async (tx) => {
      // Re-read the receipt, rather than trusting a stale delivery snapshot.
      const receipt = (await tx.get(snapshot.ref)).data();
      if (!receipt || receipt.processedAt) return;
      const [actorDoc, familyDoc] = await Promise.all([
        tx.get(db.doc(`users/${receipt.actorId}`)),
        tx.get(db.doc(`familyCircles/${receipt.familyCircleId}`)),
      ]);
      const actor = actorDoc.data();
      const family = familyDoc.data();
      if (actor) {
        // Credit the authorized action even after membership changes, quietly
        // in that case, without sharing an announcement with the old circle.
        const historical = !family || !canAct(
          receipt.actorId, receipt.actorId, actor,
          receipt.familyCircleId, family,
        );
        const prepared = await prepare(
          tx, receipt.actorId,
          actor.familyCircleId || receipt.familyCircleId, actor,
          [{kind: "created", at: receipt.at.toMillis()}], historical,
        );
        persist(tx, prepared, historical);
      }
      tx.update(snapshot.ref, {processedAt: Timestamp.now()});
    });
  });

export const recordChallengeReply = callable.onCall(async (data, context) => {
  const actorId = identifier(data.actorId);
  const familyId = identifier(data.familyCircleId);
  const challengeId = identifier(data.challengeId);
  const id = identifier(data.requestId);
  return db.runTransaction(async (tx) => {
    const {actor, family} = await authorize(
      tx,
      context.auth?.uid,
      actorId,
      familyId,
    );
    const challengeRef = db.doc(`challenges/${challengeId}`);
    const challenge = (await tx.get(challengeRef)).data();
    if (!challenge || challenge.familyCircleId !== familyId || challenge.deletingJobId) {
      fail("Challenge unavailable.");
    }
    const receipt = db.doc(`achievementEvents/reply_${id}`);
    if ((await tx.get(receipt)).exists) return {id};
    const body = text(data.text);
    const mediaUrl = text(data.mediaUrl, 2000);
    if (!body && !mediaUrl) fail("Add a message or activity photo.");
    const parentId = data.parentId ? identifier(data.parentId) : undefined;
    if (parentId) {
      const parent = (await tx.get(db.doc(`replies/${parentId}`))).data();
      if (
        !parent ||
        parent.challengeId !== challengeId ||
        parent.familyCircleId !== familyId
      ) {
        fail("Reply thread unavailable.");
      }
    }
    const completion = data.isCompletion === true;
    const contribution = Number(data.contributionValue || 0);
    if (
      !Number.isFinite(contribution) ||
      contribution < 0 ||
      contribution > 100000 ||
      (contribution && (challenge.type !== "team" || !completion))
    ) {
      fail("Invalid contribution.");
    }
    const now = Timestamp.now();
    const at = now.toMillis();
    if (
      completion &&
      (parentId || !challenge.expiresAt || at > challenge.expiresAt.toMillis())
    ) {
      fail("Challenge has expired or completion is invalid.");
    }
    if (completion && challenge.type === "team" && contribution <= 0) {
      fail("Record a positive team contribution.");
    }
    const completedBy: string[] = challenge.completedBy || [];
    const firstCompletion = completion && !completedBy.includes(actorId);
    if (completion && !firstCompletion && challenge.type !== "team") {
      return {id, alreadyCompleted: true};
    }
    const events: AchievementEvent[] = [];
    if (firstCompletion) {
      events.push({
        kind: "completion",
        at,
        category: activityId(challenge.exercise.name),
      });
    }
    if (contribution) events.push({kind: "contributions", at});
    if (!completion && body && challenge.challenger.id !== actorId) {
      events.push({kind: "comments", at});
    }
    const nextCompleted = firstCompletion ?
      [...completedBy, actorId] :
      completedBy;
    const eligibleBuddies = nextCompleted
      .filter(
        (id) => family.memberIds.includes(id) && family.members?.[id] !== false,
      )
      .slice(0, 50);
    if (firstCompletion && eligibleBuddies.length >= 2) {
      events.push({kind: "buddy", at});
    }
    const prepared = [await prepare(tx, actorId, familyId, actor, events)];
    if (firstCompletion && eligibleBuddies.length >= 2) {
      for (const buddyId of eligibleBuddies.filter((id) => id !== actorId)) {
        const buddy = (await tx.get(db.doc(`users/${buddyId}`))).data();
        if (
          buddy?.familyCircleId === familyId &&
          (buddy.status === "active" ||
            (buddy.role === "child" && !buddy.status))
        ) {
          prepared.push(
            await prepare(tx, buddyId, familyId, buddy, [
              {kind: "buddy", at},
            ]),
          );
        }
      }
    }
    const times = {
      ...(challenge.completionTimes || {}),
      ...(firstCompletion ? {[actorId]: at} : {}),
    };
    if (
      firstCompletion &&
      challenge.participationScope === "family" && challenge.participantIds &&
      fullHouse(challenge.participantIds, times, challenge.timestamp.toMillis())
    ) {
      prepared.push(
        await prepare(
          tx,
          familyId,
          familyId,
          {},
          [{kind: "fullHouse", at}],
          false,
          true,
        ),
      );
    }
    tx.create(db.doc(`replies/${id}`), {
      user: {id: actorId, name: actor.name},
      challengeId,
      familyCircleId: familyId,
      text: body,
      mediaUrl,
      timestamp: now,
      reactions: {},
      isCompletion: completion,
      ...(parentId ? {parentId} : {}),
      ...(contribution ? {contributionValue: contribution} : {}),
    });
    if (completion) {
      tx.update(challengeRef, {
        completedBy: nextCompleted,
        completionTimes: times,
        ...(contribution ?
          {currentTotal: FieldValue.increment(contribution)} :
          {}),
      });
    }
    // Existing reply XP formula, committed atomically once per request.
    const xp = (actor.xp || 0) + 10 + contribution;
    const activityMap = activityProgress(actor, now);
    tx.update(db.doc(`users/${actorId}`), {
      xp,
      level: 1 + Math.floor(xp / 500),
      activityMap,
    });
    archiveActivity(tx, actorId, activityMap, now);
    tx.create(receipt, {at: now});
    for (const entry of prepared) persist(tx, entry);
    return {id};
  });
});

export const recordChallengeReaction = callable.onCall(
  async (data, context) => {
    const actorId = identifier(data.actorId);
    const familyId = identifier(data.familyCircleId);
    const replyId = identifier(data.replyId);
    if (!["❤️", "💪", "🔥", "👏", "👍", "🎉", "🙌", "😂"].includes(data.emoji)) {
      fail("Unsupported reaction.");
    }
    return db.runTransaction(async (tx) => {
      const {actor, family} = await authorize(
        tx,
        context.auth?.uid,
        actorId,
        familyId,
      );
      const ref = db.doc(`replies/${replyId}`);
      const reply = (await tx.get(ref)).data();
      if (!reply || reply.familyCircleId !== familyId) {
        fail("Update unavailable.");
      }
      const challenge = (await tx.get(
        db.doc(`challenges/${identifier(reply.challengeId)}`),
      )).data();
      if (!challenge || challenge.familyCircleId !== familyId || challenge.deletingJobId) {
        fail("Challenge unavailable.");
      }
      const receipt = db.doc(
        `achievementEvents/reaction_${actorId}_${replyId}`,
      );
      if ((await tx.get(receipt)).exists) return {alreadyReacted: true};
      const at = Date.now();
      const prepared = await prepare(
        tx,
        actorId,
        familyId,
        actor,
        reply.user.id !== actorId &&
          family.memberIds.includes(reply.user.id) &&
          family.members?.[reply.user.id] !== false ?
          [{kind: "reactions", at}] : [],
      );
      tx.create(receipt, {
        at: Timestamp.fromMillis(at),
        familyCircleId: familyId,
        actorId,
        replyId,
      });
      tx.update(ref, {[`reactions.${data.emoji}`]: FieldValue.increment(1)});
      persist(tx, prepared);
      return {alreadyReacted: false};
    });
  },
);

export const updateAchievementProfile = callable.onCall(
  async (data, context) => {
    const actorId = identifier(data.actorId);
    const familyId = identifier(data.familyCircleId);
    return db.runTransaction(async (tx) => {
      await authorize(tx, context.auth?.uid, actorId, familyId);
      const ref = db.doc(`achievementProfiles/${actorId}`);
      const profile = (await tx.get(ref)).data() || {};
      const state: AchievementState = profile.state || emptyState();
      if (data.pinnedBadgeIds !== undefined) {
        if (!validPins(data.pinnedBadgeIds, state)) {
          fail("Pin up to three different earned badges.");
        }
        tx.set(
          ref,
          {familyCircleId: familyId, pinnedBadgeIds: data.pinnedBadgeIds},
          {merge: true},
        );
      }
      if (data.celebrate === true) {
        const ids = Object.keys(state.awards).filter(
          (id) =>
            !state.awards[id].historical &&
            !state.awards[id].celebratedAt &&
            Date.now() - state.awards[id].unlockedAt < 120000,
        );
        for (const id of ids) state.awards[id].celebratedAt = Date.now();
        if (ids.length) tx.set(ref, {state}, {merge: true});
        return {badgeIds: ids};
      }
      return {badgeIds: []};
    });
  },
);

export const achievementChatCreated = functions
  .region("us-central1")
  .runWith({failurePolicy: true})
  .firestore.document("messages/{id}")
  .onCreate(async (snapshot) => {
    const message = snapshot.data();
    if (message.type !== "text" || !text(message.text)) return;
    await db.runTransaction(async (tx) => {
      const [actorDoc, familyDoc] = await Promise.all([
        tx.get(db.doc(`users/${message.senderId}`)),
        tx.get(db.doc(`familyCircles/${message.familyCircleId}`)),
      ]);
      const actor = actorDoc.data();
      const family = familyDoc.data();
      if (
        !actor ||
        !family ||
        !canAct(
          message.authoredBy || message.senderId,
          message.senderId,
          actor,
          message.familyCircleId,
          family,
        )
      ) {
        return;
      }
      const receipt = db.doc(`achievementEvents/chat_${snapshot.id}`);
      if ((await tx.get(receipt)).exists) return;
      const prepared = await prepare(
        tx,
        message.senderId,
        message.familyCircleId,
        actor,
        [{kind: "messages", at: message.timestamp.toMillis()}],
      );
      tx.create(receipt, {at: message.timestamp});
      persist(tx, prepared);
    });
  });
