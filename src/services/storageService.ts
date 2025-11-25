import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage, db } from '../firebaseConfig';
import { doc, collection } from "firebase/firestore";

export const uploadProfileImage = async (userId: string, file: File | Blob): Promise<string> => {
    const storageRef = ref(storage, `profile-pictures/${userId}`);

    return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                // Optional: Handle progress
            },
            (error) => {
                console.error("Profile upload failed:", error);
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

export const uploadReplyImage = async (file: Blob): Promise<string> => {
    const uniqueId = doc(collection(db, 'temp')).id; // Generate a unique ID for the path
    const storageRef = ref(storage, `reply-images/${uniqueId}`);

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
