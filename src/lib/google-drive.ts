import { google, drive_v3 } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_REDIRECT_URI
  );
}

/**
 * Generate the Google OAuth consent URL.
 */
export function getAuthUrl(state: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCode(code: string) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/**
 * Get an authenticated Drive client from a refresh token.
 */
export function getDriveClient(refreshToken: string): drive_v3.Drive {
  const client = getOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth: client });
}

/**
 * Find or create a folder by name under a given parent.
 * Returns the folder ID.
 */
async function findOrCreateFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string
): Promise<string> {
  // Search for existing folder
  const query = [
    `name = '${name.replace(/'/g, "\\'")}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
  ];
  if (parentId) query.push(`'${parentId}' in parents`);

  const res = await drive.files.list({
    q: query.join(" and "),
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Create folder
  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {}),
    },
    fields: "id",
  });

  return folder.data.id!;
}

/**
 * Export images to Google Drive.
 * Creates CampLog/{folderName}/ and uploads each image.
 */
export async function exportImagesToDrive(
  refreshToken: string,
  images: { url: string; filename: string }[],
  folderName: string
): Promise<{ folderUrl: string; count: number }> {
  const drive = getDriveClient(refreshToken);

  // Find or create "CampLog" root folder
  const rootFolderId = await findOrCreateFolder(drive, "CampLog");

  // Find or create campaign subfolder
  const subFolderId = await findOrCreateFolder(drive, folderName, rootFolderId);

  // Upload images in parallel (batches of 5)
  let uploaded = 0;
  const batchSize = 5;

  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(async (img) => {
        const response = await fetch(img.url);
        const blob = await response.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        const mimeType = blob.type || "image/png";

        await drive.files.create({
          requestBody: {
            name: img.filename,
            parents: [subFolderId],
          },
          media: {
            mimeType,
            body: require("stream").Readable.from(buffer),
          },
          fields: "id",
        });
        uploaded++;
      })
    );
  }

  return {
    folderUrl: `https://drive.google.com/drive/folders/${subFolderId}`,
    count: uploaded,
  };
}
