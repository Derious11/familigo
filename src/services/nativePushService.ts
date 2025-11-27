import { PushNotifications } from "@capacitor/push-notifications";
import { addNotificationToken, removeNotificationToken } from "./userService";

// We store the user's ID so that when registration fires we can save the token.
let currentUserId: string | null = null;

/**
 * Called once on app startup (in App.tsx).
 * Sets up listeners immediately, then checks existing permission.
 */
export const initializeNativePush = async (onNotification?: (message: string) => void) => {
  console.log("NativePush: Initializing...");

  // Always attach listeners before checking permission or registering
  await registerListeners(onNotification);

  // Check if permission already exists
  try {
    const permission = await PushNotifications.checkPermissions();
    console.log("NativePush: Permission status =", permission.receive);

    if (permission.receive === "granted") {
      console.log("NativePush: Already granted — calling register()...");
      await PushNotifications.register();
    } else {
      console.log(
        "NativePush: Permission not yet granted — waiting for user request."
      );
    }
  } catch (err) {
    console.error("NativePush: Error checking permissions:", err);
  }
};

/**
 * Wraps all listeners in a single controlled function.
 * Ensures no duplicates and consistent behavior.
 */
const registerListeners = async (onNotification?: (message: string) => void) => {
  console.log("NativePush: Registering listeners...");

  // Remove old listeners to prevent duplicate callbacks
  await PushNotifications.removeAllListeners();

  // Fires when the device successfully registers and gets a token
  await PushNotifications.addListener("registration", async (token) => {
    console.log("NativePush: Received token =", token.value);

    if (currentUserId) {
      try {
        await addNotificationToken(currentUserId, token.value);
        console.log("NativePush: Token saved to backend.");
      } catch (err) {
        console.error("NativePush: Failed to save token:", err);
      }
    } else {
      console.warn(
        "NativePush: Token received but no userId set. Call requestNotificationPermission(userId)."
      );
    }
  });

  await PushNotifications.addListener("registrationError", (error) => {
    console.error("NativePush: Registration error:", error);
  });

  await PushNotifications.addListener(
    "pushNotificationReceived",
    (notification) => {
      console.log("NativePush: Notification received (foreground):", notification);

      const title = notification.title;
      const body = notification.body;
      const message = title ? `${title}: ${body}` : body || "New Notification";

      if (onNotification) {
        onNotification(message);
      }
    }
  );

  await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (notification) => {
      console.log("NativePush: Notification action tapped:", notification);
      // You can navigate based on notification.data if needed
    }
  );
};

/**
 * Called when the user taps "Enable notifications".
 * This triggers the Android/iOS permission popup.
 */
export const requestNotificationPermission = async (
  userId: string
): Promise<{ success: boolean; token?: string; error?: string }> => {
  console.log("NativePush: Requesting notification permission for user:", userId);

  currentUserId = userId;

  try {
    const permResult = await PushNotifications.requestPermissions();
    console.log("NativePush: requestPermissions() result =", permResult.receive);

    if (permResult.receive !== "granted") {
      return { success: false, error: "Permission not granted." };
    }

    console.log("NativePush: Permission granted — registering with FCM/APNS...");
    await PushNotifications.register();

    // Wait for the registration listener to fire
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn("NativePush: Token registration timeout.");
        resolve({
          success: false,
          error: "Timeout waiting for FCM token.",
        });
      }, 8000);

      PushNotifications.addListener("registration", async (token) => {
        clearTimeout(timeout);
        console.log("NativePush: Token returned to caller:", token.value);

        try {
          await addNotificationToken(userId, token.value);
        } catch (err) {
          console.error("NativePush: Failed saving token:", err);
        }

        resolve({ success: true, token: token.value });
      });

      PushNotifications.addListener("registrationError", (error) => {
        clearTimeout(timeout);
        console.error("NativePush: Registration error:", error);
        resolve({ success: false, error: JSON.stringify(error) });
      });
    });
  } catch (err: any) {
    console.error("NativePush: Error requesting permission:", err);
    return { success: false, error: err.message || "Unknown native push error" };
  }
};

/**
 * Revokes permission by removing the token from your backend.
 */
export const revokeNotificationPermission = async (
  userId: string
): Promise<void> => {
  console.log("NativePush: Revoking notification permission for user:", userId);

  try {
    await removeNotificationToken(userId);
    await PushNotifications.removeAllListeners();
  } catch (err) {
    console.error("NativePush: Error removing token:", err);
  }
};
