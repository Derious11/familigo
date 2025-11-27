import { Capacitor } from "@capacitor/core";
import {
    initializeNativePush,
    requestNotificationPermission as requestNativePermission,
    revokeNotificationPermission as revokeNativePermission,
} from "./nativePushService";

import {
    initializeWebPush,
    requestNotificationPermission as requestWebPermission,
    revokeNotificationPermission as revokeWebPermission,
} from "./webPushService";

/**
 * Called once from App.tsx on load.
 */
export const initializePush = (): (() => void) | undefined => {
    if (Capacitor.isNativePlatform()) {
        console.log("PushRouter: Initializing native push...");
        initializeNativePush();
        return undefined;
    } else {
        console.log("PushRouter: Initializing web push...");
        return initializeWebPush();
    }
};

export const requestNotificationPermission = async (userId: string) => {
    if (Capacitor.isNativePlatform()) {
        return requestNativePermission(userId);
    } else {
        return requestWebPermission(userId);
    }
};

export const revokeNotificationPermission = async (userId: string) => {
    if (Capacitor.isNativePlatform()) {
        return revokeNativePermission(userId);
    } else {
        return revokeWebPermission(userId);
    }
};
