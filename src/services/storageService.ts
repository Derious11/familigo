import { uploadBytesResumable, getDownloadURL, UploadMetadata, ref } from "firebase/storage";
import { storage, db } from '../firebaseConfig';
import { doc, collection } from "firebase/firestore";
import { clearAvatarCache, getAvatarDownloadUrl, getAvatarStorageRef } from "../lib/avatar";

export const uploadProfileImage = async (userId: string, file: File | Blob): Promise<string> => {
    if (!(file as File).type?.startsWith?.("image/") && !(file as Blob).type?.startsWith?.("image/")) {
        throw new Error("Only image uploads are allowed for avatars.");
    }

    const storageRef = getAvatarStorageRef(userId);
    const metadata: UploadMetadata = {
        contentType: (file as File).type || "image/jpeg",
    };

    return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file, metadata);

        uploadTask.on('state_changed',
            (snapshot) => {
                // Optional: Handle progress
            },
            (error) => {
                console.error("Profile upload failed:", error);
                reject(error);
            },
            () => {
                clearAvatarCache(userId);
                getAvatarDownloadUrl(userId, Date.now())
                    .then((downloadURL) => resolve(downloadURL))
                    .catch((err) => reject(err));
            }
        );
    });
};

export const uploadReplyImage = async (userId: string, challengeId: string, file: Blob): Promise<string> => {
    const uniqueId = doc(collection(db, 'temp')).id; // Generate a unique ID for the file
    const storageRef = ref(storage, `reply-images/${userId}/${challengeId}/${uniqueId}`);

    return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                // You can add progress logging here if needed
                // const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                // console.log('Upload is ' + progress + '% done');
            },
            (error) => {
                console.error("Upload failed:", error);
                reject(error);
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    resolve(downloadURL);
                });
            }
        );
    });
};
