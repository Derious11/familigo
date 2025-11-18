import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

// Initialize the Firebase Admin SDK.
// This gives the functions access to other Firebase services.
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Interface for the User document stored in Firestore.
 * We only need the notificationTokens for this function.
 */
interface UserProfile {
  notificationTokens?: string[];
}

/**
 * Fetches all valid notification tokens for a given array of user IDs.
 *
 * @param {string[]} userIds - An array of user IDs.
 * @return {Promise<string[]>} A promise that resolves to an array of tokens.
 */
const getTokensForUsers = async (userIds: string[]): Promise<string[]> => {
  if (userIds.length === 0) {
    return [];
  }

  const tokens: string[] = [];
  const chunks: string[][] = [];

  // Firestore 'in' queries are limited to 30 items per query.
  // We chunk the userIds to handle more than 30 recipients safely.
  for (let i = 0; i < userIds.length; i += 30) {
    chunks.push(userIds.slice(i, i + 30));
  }

  for (const chunk of chunks) {
    const usersQuery = await db
      .collection("users")
      .where(admin.firestore.FieldPath.documentId(), "in", chunk)
      .get();

    usersQuery.forEach((doc) => {
      const user = doc.data() as UserProfile;
      if (user.notificationTokens && user.notificationTokens.length > 0) {
        tokens.push(...user.notificationTokens);
      }
    });
  }

  return tokens;
};

/**
 * Cloud Function that triggers when a new challenge is created.
 * It sends a push notification to all other members of the family circle.
 */
export const onChallengeCreated = functions.firestore
  .document("challenges/{challengeId}")
  .onCreate(async (snapshot: functions.firestore.QueryDocumentSnapshot) => {
    const challengeData = snapshot.data();
    if (!challengeData) {
      console.log("No data associated with the event");
      return;
    }

    const {familyCircleId, challenger, exercise} = challengeData;
    const challengerId = challenger.id;

    // 1. Get the family circle to find all members
    const circleDoc = await db
      .collection("familyCircles")
      .doc(familyCircleId)
      .get();
    if (!circleDoc.exists) {
      console.log(`Family circle ${familyCircleId} not found.`);
      return;
    }

    // 2. Get recipient IDs (all members except the challenger)
    const memberIds: string[] = circleDoc.data()?.memberIds || [];
    const recipientIds = memberIds.filter((id) => id !== challengerId);

    if (recipientIds.length === 0) {
      console.log("No other members in the circle to notify.");
      return;
    }

    // 3. Get the notification tokens for the recipients
    const tokens = await getTokensForUsers(recipientIds);
    if (tokens.length === 0) {
      console.log("No notification tokens found for recipients.");
      return;
    }

    // 4. Construct the notification payload
    const payload: admin.messaging.MulticastMessage = {
      notification: {
        title: "New Challenge!",
        body: `${challenger.name} challenged you to ${exercise.name}!`,
      },
      tokens,
      webpush: {
        notification: {
          icon: "https://familigo-11643.web.app/assets/FamiliGo_logo.png",
        },
      },
    };

    // 5. Send the notifications
    console.log(`Sending notification to ${tokens.length} tokens.`);
    await messaging.sendEachForMulticast(payload);
  });

/**
 * Cloud Function that triggers when a new reply is created.
 * It sends a push notification to the creator of the challenge
 * or the author of the parent reply.
 */
export const onReplyCreated = functions.firestore
  .document("replies/{replyId}")
  .onCreate(async (snapshot: functions.firestore.QueryDocumentSnapshot) => {
    const replyData = snapshot.data();
    if (!replyData) {
      console.log("No data associated with the event");
      return;
    }

    const {user, challengeId, parentId, text} = replyData;
    const replierId = user.id;

    let recipientId: string | undefined;
    let notificationTitle = "";

    // Determine who the recipient is
    if (parentId) {
      // This is a nested reply, notify the parent commenter
      const parentReplyDoc = await db
        .collection("replies")
        .doc(parentId)
        .get();
      if (parentReplyDoc.exists) {
        recipientId = parentReplyDoc.data()?.user.id;
        notificationTitle = "New reply to your comment";
      }
    } else {
      // This is a top-level comment, notify the challenge creator
      const challengeDoc = await db
        .collection("challenges")
        .doc(challengeId)
        .get();
      if (challengeDoc.exists) {
        recipientId = challengeDoc.data()?.challenger.id;
        notificationTitle = "New comment on your challenge";
      }
    }

    // Ensure we have a recipient and they are not the person who made the reply
    if (!recipientId || recipientId === replierId) {
      console.log("No recipient or recipient is the sender.");
      return;
    }

    // Get recipient's tokens
    const tokens = await getTokensForUsers([recipientId]);
    if (tokens.length === 0) {
      console.log("Recipient has no notification tokens.");
      return;
    }

    // Construct and send the notification
    const notificationBody =
      `${user.name}: ${text || "posted a photo"}`;
    const payload: admin.messaging.MulticastMessage = {
      notification: {
        title: notificationTitle,
        body: notificationBody.substring(0, 200), // Truncate for safety
      },
      tokens,
      webpush: {
        notification: {
          icon:
            user.avatarUrl ||
            "https://familigo-11643.web.app/assets/FamiliGo_logo.png",
        },
      },
    };

    console.log(`Sending reply notification to ${tokens.length} tokens.`);
    await messaging.sendEachForMulticast(payload);
  });
