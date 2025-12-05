import * as functions from "firebase-functions/v1";
import {db} from "../init";
import {getTokensForUsers, sendNotifications} from "../utils/notifications";

const REGION = "us-central1";

/**
 * Cloud Function that triggers when a new challenge is created.
 * It sends a push notification to all other members of the family circle.
 */
export const onChallengeCreated = functions
  .region(REGION)
  .firestore.document("challenges/{challengeId}")
  .onCreate(async (snapshot: functions.firestore.QueryDocumentSnapshot) => {
    const logContext = `challenge:${snapshot.id}`;

    try {
      const challengeData = snapshot.data();
      if (!challengeData) {
        console.log(`[${logContext}] No data associated with the event.`);
        return;
      }

      const {familyCircleId, challenger, exercise} = challengeData;
      if (!familyCircleId || !challenger?.id || !exercise?.name) {
        console.warn(
          `[${logContext}] Missing required fields on challenge document.`,
          challengeData
        );
        return;
      }

      const challengerId = challenger.id;

      // 1. Get the family circle to find all members
      const circleDoc = await db
        .collection("familyCircles")
        .doc(familyCircleId)
        .get();
      if (!circleDoc.exists) {
        console.log(
          `[${logContext}] Family circle ${familyCircleId} not found.`
        );
        return;
      }

      // 2. Get recipient IDs (all members except the challenger)
      const memberIds: string[] = circleDoc.data()?.memberIds || [];
      const recipientIds = memberIds.filter(
        (id) => Boolean(id) && id !== challengerId
      );

      if (recipientIds.length === 0) {
        console.log(
          `[${logContext}] No other members in the circle to notify.`
        );
        return;
      }

      // 3. Get the notification tokens for the recipients
      const tokenRecords = await getTokensForUsers(recipientIds);
      if (tokenRecords.length === 0) {
        console.log(
          `[${logContext}] No notification tokens found for recipients.`
        );
        return;
      }

      await sendNotifications(
        tokenRecords,
        (tokens) => ({
          notification: {
            title: "New Challenge!",
            body: `${challenger.name} challenged you to ${exercise.name}!`,
          },
          tokens,
          webpush: {
            notification: {
              icon:
                "https://familigo-11643.web.app/assets/FamiliGo_logo.png",
            },
          },
        }),
        logContext
      );
    } catch (error) {
      console.error(
        `[${logContext}] Failed to process challenge notification.`,
        error
      );
    }
  });

/**
 * Cloud Function that triggers when a new reply is created.
 * It sends a push notification to the creator of the challenge
 * or the author of the parent reply.
 */
export const onReplyCreated = functions
  .region(REGION)
  .firestore.document("replies/{replyId}")
  .onCreate(async (snapshot: functions.firestore.QueryDocumentSnapshot) => {
    const logContext = `reply:${snapshot.id}`;

    try {
      const replyData = snapshot.data();
      if (!replyData) {
        console.log(`[${logContext}] No data associated with the event.`);
        return;
      }

      const {user, challengeId, parentId, text} = replyData;
      if (!user?.id || !user?.name) {
        console.warn(
          `[${logContext}] Reply is missing user information.`,
          replyData
        );
        return;
      }

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
          recipientId = parentReplyDoc.data()?.user?.id;
          notificationTitle = "New reply to your comment";
        }
      } else if (challengeId) {
        // This is a top-level comment, notify the challenge creator
        const challengeDoc = await db
          .collection("challenges")
          .doc(challengeId)
          .get();
        if (challengeDoc.exists) {
          recipientId = challengeDoc.data()?.challenger?.id;
          notificationTitle = "New comment on your challenge";
        }
      }

      // Ensure we notify someone other than the author
      if (!recipientId || recipientId === replierId) {
        console.log(`[${logContext}] No recipient or recipient is the sender.`);
        return;
      }

      // Get recipient's tokens
      const tokenRecords = await getTokensForUsers([recipientId]);
      if (tokenRecords.length === 0) {
        console.log(`[${logContext}] Recipient has no notification tokens.`);
        return;
      }

      const notificationBody = `${user.name}: ${text || "posted a photo"}`;
      await sendNotifications(
        tokenRecords,
        (tokens) => ({
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
        }),
        logContext
      );
    } catch (error) {
      console.error(
        `[${logContext}] Failed to process reply notification.`,
        error
      );
    }
  });

/**
 * Cloud Function that triggers when a new chat message is created.
 * It sends a push notification to all other members of the family circle.
 */
export const onMessageCreated = functions
  .region(REGION)
  .firestore.document("messages/{messageId}")
  .onCreate(async (snapshot: functions.firestore.QueryDocumentSnapshot) => {
    const logContext = `message:${snapshot.id}`;

    try {
      const messageData = snapshot.data();
      if (!messageData) {
        console.log(`[${logContext}] No data associated with the event.`);
        return;
      }

      const {familyCircleId, senderId, senderName, text, type} = messageData;

      // Only send notifications for text messages, not system messages
      if (type !== "text") {
        return;
      }

      if (!familyCircleId || !senderId) {
        console.warn(
          `[${logContext}] Missing required fields on message document.`,
          messageData
        );
        return;
      }

      // 1. Get the family circle to find all members and chat name
      const circleDoc = await db
        .collection("familyCircles")
        .doc(familyCircleId)
        .get();
      if (!circleDoc.exists) {
        console.log(
          `[${logContext}] Family circle ${familyCircleId} not found.`
        );
        return;
      }

      const circleData = circleDoc.data();
      const chatName = circleData?.chatName || "Family Chat";
      const memberIds: string[] = circleData?.memberIds || [];

      // 2. Get recipient IDs (all members except the sender)
      const recipientIds = memberIds.filter(
        (id) => Boolean(id) && id !== senderId
      );

      if (recipientIds.length === 0) {
        console.log(
          `[${logContext}] No other members in the circle to notify.`
        );
        return;
      }

      // 3. Get the notification tokens for the recipients
      const tokenRecords = await getTokensForUsers(recipientIds);
      if (tokenRecords.length === 0) {
        console.log(
          `[${logContext}] No notification tokens found for recipients.`
        );
        return;
      }

      await sendNotifications(
        tokenRecords,
        (tokens) => ({
          notification: {
            title: chatName,
            body: `${senderName}: ${text}`,
          },
          tokens,
          webpush: {
            notification: {
              icon: "https://familigo-11643.web.app/assets/FamiliGo_logo.png",
            },
          },
        }),
        logContext
      );
    } catch (error) {
      console.error(
        `[${logContext}] Failed to process message notification.`,
        error
      );
    }
  });
