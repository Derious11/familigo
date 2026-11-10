import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

export const app = initializeApp(__FIREBASE_CONFIG__);
export const auth = getAuth(app);
if (import.meta.env.MODE === 'emulator') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9095', { disableWarnings: true });
}
