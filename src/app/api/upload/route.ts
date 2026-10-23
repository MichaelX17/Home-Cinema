import fsPromises from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { CATALOG_CACHE_KEY, invalidate } from "@/lib/media-cache";
import { generateUploadSession, validateUploadSession, refreshUploadSession } from "@/lib/network-upload";

export const runtime = "nodejs";

const MEDIA_STORAGE_DIR = path.join(process.cwd(), "../movies-files");

async function fsExists(filePath: string): Promise<boolean> {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch {
    return false;
  }
}


const mimeToExt: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/x-matroska": ".mkv",
  "video/quicktime": ".mov",
  "video/x-msvideo": ".avi",
  "video/webm": ".webm",
  "application/json": ".json",
};

const getExtensionFromMime = (mimeType?: string): string => {
  if (!mimeType) return "";
  return mimeToExt[mimeType.toLowerCase()] || "";
};

const sanitizeName = (value: unknown, fallbackExt = "") => {
  let name = String(value ?? "").trim();
  if (!name) name = `file-${Date.now()}`;

  let ext = "";
  const lastDot = name.lastIndexOf(".");
  if (lastDot !== -1 && lastDot > 0 && lastDot < name.length - 1) {
    ext = name.slice(lastDot);
    name = name.slice(0, lastDot);
  } else if (fallbackExt) {
    ext = fallbackExt.startsWith(".") ? fallbackExt : `.${fallbackExt}`;
  }

  const cleanBase = name
    .replace(/[\\/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);

  const finalName = cleanBase || `file-${Date.now()}`;
  return ext ? `${finalName}${ext}` : finalName;
};

const safeFolderName = (folderName: unknown) => {
  const cleaned = sanitizeName(folderName || "media", "");
  return cleaned || `media-${Date.now()}`;
};

const sanitizeRelativePath = (rawPath: string) => {
  const normalized = rawPath.replace(/\\/g, "/");
  const segments = normalized
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== "." && segment !== "..")
    .map((segment) => sanitizeName(segment));
  return segments.join(path.sep);
};

const removeMatchingEntries = async (directoryPath: string, predicate: (entryName: string) => boolean) => {
  if (!(await fsExists(directoryPath))) return;

  for (const entry of await fsPromises.readdir(directoryPath)) {
    if (predicate(entry)) {
      await fsPromises.rm(path.join(directoryPath, entry), { recursive: true, force: true });
    }
  }
};

const removeExistingImages = (directoryPath: string): Promise<void> => {
  return removeMatchingEntries(directoryPath, (entryName) => /\.(jpg|jpeg|png|webp)$/i.test(entryName));
};

const removeExistingVideoFiles = (directoryPath: string): Promise<void> => {
  return removeMatchingEntries(directoryPath, (entryName) => /\.(mp4|mkv|avi|mov|webm)$/i.test(entryName));
};

const removeExistingSeriesMedia = (directoryPath: string): Promise<void> => {
  return removeMatchingEntries(directoryPath, (entryName) =>
    entryName.toLowerCase().includes("season")
  ).then(() => removeExistingVideoFiles(directoryPath));
};

const handleChunkUpload = async (req: Request) => {
  const rawFileNameHeader = req.headers.get("x-file-name");
  const chunkIndexHeader = req.headers.get("x-chunk-index");
  const totalChunksHeader = req.headers.get("x-total-chunks");
  const rawFolderHeader = req.headers.get("x-folder-name");
  const uploadIdHeader = req.headers.get("x-upload-id");

  if (!rawFileNameHeader || chunkIndexHeader === null || totalChunksHeader === null) {
    return NextResponse.json({ ok: false, error: "Missing chunk headers x-file-name, x-chunk-index or x-total-chunks." }, { status: 400 });
  }

  const chunkIndex = Number(chunkIndexHeader);
  const totalChunks = Number(totalChunksHeader);
  if (!Number.isInteger(chunkIndex) || !Number.isInteger(totalChunks) || totalChunks <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid chunk index or total chunks." }, { status: 400 });
  }

  const fileNameHeader = decodeURIComponent(rawFileNameHeader);
  const folderName = rawFolderHeader ? safeFolderName(decodeURIComponent(rawFolderHeader)) : "";

  // Create server-side tracked upload session for cross-PC support
  let uploadId = uploadIdHeader;
  if (!uploadId) {
    // Generate a new session if none provided (for clients that don't send the header)
    const { uploadId: newUploadId } = generateUploadSession(req.headers, folderName);
    uploadId = newUploadId;
  }

  // Validate the upload session (server-side tracking for cross-PC compatibility)
  if (!validateUploadSession(uploadId, req.headers)) {
    // If session validation fails, generate a new one
    const { uploadId: newUploadId } = generateUploadSession(req.headers, folderName);
    uploadId = newUploadId;
  }

  // Refresh session on activity to keep it alive
  refreshUploadSession(uploadId);

  const rawFilePathHeader = req.headers.get("x-file-path");
  const filePathHeader = rawFilePathHeader ? decodeURIComponent(rawFilePathHeader) : fileNameHeader;
  const safeRelativePath = sanitizeRelativePath(filePathHeader);
  if (!safeRelativePath) {
    return NextResponse.json({ ok: false, error: "Invalid file path." }, { status: 400 });
  }

  const targetDir = folderName ? path.join(MEDIA_STORAGE_DIR, folderName) : MEDIA_STORAGE_DIR;
  await fsPromises.mkdir(targetDir, { recursive: true });

  const targetFilePath = path.join(targetDir, safeRelativePath);
  await fsPromises.mkdir(path.dirname(targetFilePath), { recursive: true });

  // Use the validated upload ID in the temp file name
  const tempFilePath = `${targetFilePath}.${uploadId}.part`;
  const finalFilePath = targetFilePath;

  try {
    if (chunkIndex === 0 && (await fsExists(tempFilePath))) {
      await fsPromises.unlink(tempFilePath);
    }

    const rawBody = await req.arrayBuffer();
    const chunkBuffer = Buffer.from(rawBody);
    await fsPromises.appendFile(tempFilePath, chunkBuffer);

    if (chunkIndex === totalChunks - 1) {
      // Atomic replace: only delete the existing file after temp is complete
      if (await fsExists(finalFilePath)) {
        await fsPromises.unlink(finalFilePath);
      }
      await fsPromises.rename(tempFilePath, finalFilePath);

      // Clean up old video files that are not the one just uploaded (Issue 2.3)
      const replaceMedia = req.headers.get("x-replace-media") === "true";
      if (replaceMedia) {
        const targetDir = path.dirname(targetFilePath);
        try {
          const dirEntries = await fsPromises.readdir(targetDir);
          for (const entry of dirEntries) {
            const entryPath = path.join(targetDir, entry);
            if (entryPath === finalFilePath) continue;
            if (/\.(mp4|mkv|avi|mov|webm)$/i.test(entry)) {
              await fsPromises.rm(entryPath, { force: true });
            }
          }
        } catch (cleanupErr) {
          console.error("Cleanup of old video files failed", cleanupErr);
        }
      }

      // Invalidate catalog cache so the next GET reflects the new file
      invalidate(CATALOG_CACHE_KEY);
    }

    return NextResponse.json({ ok: true, uploadId });
  } catch (error) {
    console.error("Chunk upload failed", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
};

const handleMultipartUpload = async (req: Request) => {
  const contentType = String(req.headers.get("content-type") || "");
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ ok: false, error: "Content-Type must be multipart/form-data." }, { status: 400 });
  }

  await fsPromises.mkdir(MEDIA_STORAGE_DIR, { recursive: true });

  const formData = await req.formData();
  const fields: Record<string, string> = {};
  const uploadedFiles: Array<{ fieldName: string; file: File }> = [];
  let folderName = `media-${Date.now()}`;
  let targetMediaDir = "";

  const createMediaDir = async (rawFolderName: unknown) => {
    folderName = safeFolderName(rawFolderName);
    targetMediaDir = path.join(MEDIA_STORAGE_DIR, folderName);
    await fsPromises.mkdir(targetMediaDir, { recursive: true });
  };

  const appendFileFromFormEntry = async (entry: File, destPath: string) => {
    const buffer = Buffer.from(await entry.arrayBuffer());
    await fsPromises.writeFile(destPath, buffer);
  };

  try {
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        fields[key] = value;
        continue;
      }

      if (value instanceof File) {
        uploadedFiles.push({ fieldName: key, file: value });
      }
    }

    const mode = fields.mode === "edit" ? "edit" : "create";
    const existingFolder = fields.existingFolder || "";

    if (mode === "edit") {
      const sourceFolder = safeFolderName(existingFolder || fields.folderName || "media");
      const sourceDir = path.join(MEDIA_STORAGE_DIR, sourceFolder);
      const targetFolder = safeFolderName(fields.folderName || existingFolder || sourceFolder);
      const resolvedTargetDir = path.join(MEDIA_STORAGE_DIR, targetFolder);

      if ((await fsExists(sourceDir)) && sourceFolder !== targetFolder) {
        if (await fsExists(resolvedTargetDir)) {
          throw new Error("Target folder already exists");
        }
        await fsPromises.rename(sourceDir, resolvedTargetDir);
      }

      targetMediaDir = (await fsExists(resolvedTargetDir)) ? resolvedTargetDir : sourceDir;
      await fsPromises.mkdir(targetMediaDir, { recursive: true });

      // Note: old video files are not deleted here to prevent data loss if the
      // subsequent chunked upload fails. Cleanup is deferred to handleChunkUpload
      // which deletes old videos only after the new video temp file is complete
      // and ready to be atomically renamed (Issue 2.3).
    } else {
      await createMediaDir(fields.folderName || folderName);
    }

    if (!targetMediaDir) {
      await createMediaDir(fields.folderName || folderName);
    }

    for (const { fieldName, file } of uploadedFiles) {
      if (mode === "edit" && fieldName === "cover") {
        await removeExistingImages(targetMediaDir);
      }

      const rawFilename = file.name || `${fieldName}-${Date.now()}`;
      const safeFilename = sanitizeName(rawFilename, getExtensionFromMime(file.type));
      const destPath = path.join(targetMediaDir, safeFilename);
      await appendFileFromFormEntry(file, destPath);
    }

    if (fields.info) {
      const infoPath = path.join(targetMediaDir, "info.json");
      await fsPromises.writeFile(infoPath, fields.info, "utf-8");
    }

    // Invalidate catalog cache so the next GET reflects the new/updated media
    invalidate(CATALOG_CACHE_KEY);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Metadata upload failed", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
};

export async function POST(req: Request) {
  if (req.headers.has("x-file-name")) {
    return handleChunkUpload(req);
  }
  return handleMultipartUpload(req);
}
