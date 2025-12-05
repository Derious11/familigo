import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as path from "path";
import * as os from "os";
import * as fs from "fs-extra";
import sharp from "sharp";

const REGION = "us-central1";

/**
 * Cloud Function that triggers when an image is uploaded to Storage.
 * It generates a thumbnail and updates the corresponding Firestore document
 * if applicable.
 */
export const generateThumbnail = functions
  .region(REGION)
  .storage.object()
  .onFinalize(async (object) => {
    const fileBucket = object.bucket;
    const filePath = object.name;
    if (!filePath) {
      console.log("No file path.");
      return;
    }
    const contentType = object.contentType;

    // Exit if this is triggered on a file that is not an image.
    if (!contentType?.startsWith("image/")) {
      return console.log("This is not an image.");
    }

    // Exit if the image is already a thumbnail.
    const fileName = path.basename(filePath);
    if (fileName.startsWith("thumb_")) {
      return console.log("Already a thumbnail.");
    }

    // Download file from bucket.
    const bucket = admin.storage().bucket(fileBucket);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    const metadata = {
      contentType: contentType,
    };

    await bucket.file(filePath).download({destination: tempFilePath});
    console.log("Image downloaded locally to", tempFilePath);

    // Generate a thumbnail using sharp.
    const thumbFileName = `thumb_${fileName}`;
    const thumbFilePath = path.join(path.dirname(filePath), thumbFileName);
    const tempThumbPath = path.join(os.tmpdir(), thumbFileName);

    await sharp(tempFilePath)
      .resize(200, 200, {fit: "inside"})
      .toFile(tempThumbPath);
    console.log("Thumbnail created at", tempThumbPath);

    // Uploading the thumbnail.
    await bucket.upload(tempThumbPath, {
      destination: thumbFilePath,
      metadata: metadata,
    });
    console.log("Thumbnail uploaded to Storage at", thumbFilePath);

    // Once the thumbnail has been uploaded, delete the local file to free up
    // space.
    // space.
    // eslint-disable-next-line max-len
    await fs.unlink(tempFilePath);
    await fs.unlink(tempThumbPath);
  });
