import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as path from "path";
import * as os from "os";
import * as fs from "fs-extra";
import sharp from "sharp";

// Initialize the Firebase Admin SDK.
// This gives the functions access to other Firebase services.
admin.initializeApp();

const REGION = "us-central1";
const MAX_IN_QUERY = 30;
const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Interface for the User document stored in Firestore.
 * We only need the notificationTokens for this function.
 */
interface UserProfile {
  notificationTokens?: string[];
}

interface TokenRecord {
  token: string;
  userId: string;
}

const chunkArray = <T>(items: T[], size: number): T[][] => {
  if (size <= 0) {
    return [];
  }

  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};

/**
 * Fetches all valid notification tokens for a given array of user IDs.
 *
 * @param {string[]} userIds - An array of user IDs.
 * @return {Promise<string[]>} A promise that resolves to an array of tokens.
 */
const getTokensForUsers = async (userIds: string[]): Promise<TokenRecord[]> => {
  if (userIds.length === 0) {
    return [];
  }

  const uniqueUserIds = Array.from(new Set(userIds));
  const chunks = chunkArray(uniqueUserIds, MAX_IN_QUERY);
  const seenTokens = new Set<string>();
  const tokenRecords: TokenRecord[] = [];

  // Firestore 'in' queries are limited to 30 items per query.
  for (const chunk of chunks) {
    const usersQuery = await db
      .collection("users")
      .where(admin.firestore.FieldPath.documentId(), "in", chunk)
      .get();

    usersQuery.forEach((doc) => {
      const user = doc.data() as UserProfile;
      (user.notificationTokens || []).forEach((token) => {
        if (!token || seenTokens.has(token)) {
          return;
        }
        seenTokens.add(token);
        tokenRecords.push({ token, userId: doc.id });
      });
    });
  }

  return tokenRecords;
};

type PayloadBuilder = (tokens: string[]) => admin.messaging.MulticastMessage;

const removeInvalidTokens = async (
  invalidRecords: TokenRecord[],
  logContext: string
): Promise<void> => {
  if (invalidRecords.length === 0) {
    return;
  }

  console.log(
    `[${logContext}] Removing ${invalidRecords.length}` +
    " invalid tokens from Firestore."
  );

  await Promise.all(
    invalidRecords.map(({ token, userId }) =>
      db
        .collection("users")
        .doc(userId)
        .update({
          notificationTokens: admin.firestore.FieldValue.arrayRemove(token),
        })
        .catch((error) => {
          console.error(
            `[${logContext}] Failed to remove token for user ${userId}`,
            error
          );
        })
    )
  );
};

const handleSendResponse = async (
  result: admin.messaging.BatchResponse,
  tokenRecords: TokenRecord[],
  logContext: string
): Promise<void> => {
  const invalidRecords: TokenRecord[] = [];

  result.responses.forEach((response, index) => {
    if (response.success) {
      return;
    }

    const record = tokenRecords[index];
    const errorCode = response.error?.code || "unknown";
    const warningMessage =
      `[${logContext}] Failed to deliver notification to user ` +
      `${record.userId}.`;
    console.warn(`${warningMessage} Code: ${errorCode}`, response.error);

    if (INVALID_TOKEN_CODES.has(errorCode)) {
      invalidRecords.push(record);
    }
  });

  await removeInvalidTokens(invalidRecords, logContext);
};

const sendNotifications = async (
  tokenRecords: TokenRecord[],
  buildPayload: PayloadBuilder,
  logContext: string
): Promise<void> => {
  if (tokenRecords.length === 0) {
    console.log(`[${logContext}] No notification tokens available.`);
    return;
  }

  const tokens = tokenRecords.map((record) => record.token);
  const payload = buildPayload(tokens);

  console.log(
    `[${logContext}] Sending notification to ${tokens.length} tokens.`
  );
  const response = await messaging.sendEachForMulticast(payload);
  await handleSendResponse(response, tokenRecords, logContext);
};

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

      const { familyCircleId, challenger, exercise } = challengeData;
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
              icon: "https://familigo-11643.web.app/assets/FamiliGo_logo.png",
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

      const { user, challengeId, parentId, text } = replyData;
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

      const { familyCircleId, senderId, senderName, text, type } = messageData;

      // Only send notifications for text messages, not system messages
      if (type !== 'text') {
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

/**
 * Cloud Function that triggers when an image is uploaded to Storage.
 * It generates a thumbnail and updates the corresponding Firestore document if applicable.
 */
export const generateThumbnail = functions
  .region(REGION)
  .storage.object()
  .onFinalize(async (object) => {
    const fileBucket = object.bucket;
    const filePath = object.name;
    const contentType = object.contentType;

    // Exit if this is triggered on a file that is not an image.
    if (!contentType?.startsWith("image/")) {
      return console.log("This is not an image.");
    }

    // Exit if the image is already a thumbnail.
    const fileName = path.basename(filePath!);
    if (fileName.startsWith("thumb_")) {
      return console.log("Already a thumbnail.");
    }

    // Download file from bucket.
    const bucket = admin.storage().bucket(fileBucket);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const metadata = {
      contentType: contentType,
    };

    await bucket.file(filePath!).download({ destination: tempFilePath });
    console.log("Image downloaded locally to", tempFilePath);

    // Generate a thumbnail using sharp.
    const thumbFileName = `thumb_${fileName}`;
    const thumbFilePath = path.join(path.dirname(filePath!), thumbFileName);
    const tempThumbPath = path.join(os.tmpdir(), thumbFileName);

    await sharp(tempFilePath)
      .resize(200, 200, { fit: "inside" })
      .toFile(tempThumbPath);
    console.log("Thumbnail created at", tempThumbPath);

    // Uploading the thumbnail.
    await bucket.upload(tempThumbPath, {
      destination: thumbFilePath,
      metadata: metadata,
    });
    console.log("Thumbnail uploaded to Storage at", thumbFilePath);

    // Once the thumbnail has been uploaded, delete the local file to free up space.
    await fs.unlink(tempFilePath);
    await fs.unlink(tempThumbPath);
  });
