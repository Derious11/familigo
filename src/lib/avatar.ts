import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "../firebaseConfig";

const AVATAR_ROOT = "profile-pictures";
export const AVATAR_PLACEHOLDER = "/assets/FamiliGo_logo_nobg.png";

type CacheKey = string | number | undefined;

const avatarUrlCache = new Map<string, Promise<string>>();

const buildCacheKey = (userId: string, cacheKey?: CacheKey) =>
    `${userId}:${cacheKey ?? ""}`;

/**
 * Returns the canonical storage reference for a user's avatar.
 */
export const getAvatarStorageRef = (userId: string) => {
    const normalizedUserId = userId?.trim();
    if (!normalizedUserId) {
        throw new Error("A valid userId is required to build an avatar path.");
    }
    return ref(storage, `${AVATAR_ROOT}/${normalizedUserId}/avatar.jpg`);
};

/**
 * Resolves the download URL for a user's avatar, with in-memory caching and
 * a safe placeholder fallback when the object does not exist.
 */
export const getAvatarDownloadUrl = async (
    userId: string,
    cacheKey?: CacheKey
): Promise<string> => {
    const normalizedUserId = userId?.trim();
    if (!normalizedUserId) return AVATAR_PLACEHOLDER;

    const key = buildCacheKey(normalizedUserId, cacheKey);

    if (!avatarUrlCache.has(key)) {
        avatarUrlCache.set(
            key,
            (async () => {
                try {
                    return await getDownloadURL(getAvatarStorageRef(normalizedUserId));
                } catch (error: any) {
                    if (error?.code === "storage/object-not-found") {
                        return AVATAR_PLACEHOLDER;
                    }
                    console.warn(`[avatar] Failed to resolve avatar for ${normalizedUserId}`, error);
                    return AVATAR_PLACEHOLDER;
                }
            })()
        );
    }

    return avatarUrlCache.get(key)!;
};

/**
 * Clears cached download URLs. When a cacheKey is provided, only that
 * version is removed. Otherwise, every cached entry for the user is purged.
 */
export const clearAvatarCache = (userId?: string, cacheKey?: CacheKey) => {
    if (!userId) {
        avatarUrlCache.clear();
        return;
    }

    const normalizedUserId = userId.trim();
    if (!normalizedUserId) return;

    if (cacheKey !== undefined) {
        avatarUrlCache.delete(buildCacheKey(normalizedUserId, cacheKey));
        return;
    }

    for (const key of avatarUrlCache.keys()) {
        if (key.startsWith(`${normalizedUserId}:`)) {
            avatarUrlCache.delete(key);
        }
    }
};
