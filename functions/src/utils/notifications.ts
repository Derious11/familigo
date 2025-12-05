import * as admin from "firebase-admin";
import {db, messaging} from "../init";

const MAX_IN_QUERY = 30;
const INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

/**
 * Interface for the User document stored in Firestore.
 * We only need the notificationTokens for this function.
 */
export interface UserProfile {
    notificationTokens?: string[];
}

export interface TokenRecord {
    token: string;
    userId: string;
}

export const chunkArray = <T>(items: T[], size: number): T[][] => {
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
export const getTokensForUsers = async (
  userIds: string[]
): Promise<TokenRecord[]> => {
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
        tokenRecords.push({token, userId: doc.id});
      });
    });
  }

  return tokenRecords;
};

export type PayloadBuilder = (
    tokens: string[]
) => admin.messaging.MulticastMessage;

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
    invalidRecords.map(({token, userId}) =>
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

export const sendNotifications = async (
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
