import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MEDIA_STORAGE_DIR = path.join(process.cwd(), "../movies-files");

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

const removeMatchingEntries = (directoryPath: string, predicate: (entryName: string) => boolean) => {
  if (!fs.existsSync(directoryPath)) return;

  for (const entry of fs.readdirSync(directoryPath)) {
    const entryPath = path.join(directoryPath, entry);
    if (predicate(entry)) {
      fs.rmSync(entryPath, { recursive: true, force: true });
    }
  }
};

const removeExistingImages = (directoryPath: string) => {
  removeMatchingEntries(directoryPath, (entryName) => /\.(jpg|jpeg|png|webp)$/i.test(entryName));
};

const removeExistingVideoFiles = (directoryPath: string) => {
  removeMatchingEntries(directoryPath, (entryName) => /\.(mp4|mkv|avi|mov|webm)$/i.test(entryName));
};

const removeExistingSeriesMedia = (directoryPath: string) => {
  removeMatchingEntries(directoryPath, (entryName) => entryName.toLowerCase().includes("season"));
  removeExistingVideoFiles(directoryPath);
};

const handleChunkUpload = async (req: Request) => {
  const rawFileNameHeader = req.headers.get("x-file-name");
  const chunkIndexHeader = req.headers.get("x-chunk-index");
  const totalChunksHeader = req.headers.get("x-total-chunks");
  const rawFolderHeader = req.headers.get("x-folder-name");

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
  const targetDir = folderName ? path.join(MEDIA_STORAGE_DIR, folderName) : MEDIA_STORAGE_DIR;
  fs.mkdirSync(targetDir, { recursive: true });

  const rawFilePathHeader = req.headers.get("x-file-path");
  const filePathHeader = rawFilePathHeader ? decodeURIComponent(rawFilePathHeader) : fileNameHeader;
  const safeRelativePath = sanitizeRelativePath(filePathHeader);
  if (!safeRelativePath) {
    return NextResponse.json({ ok: false, error: "Invalid file path." }, { status: 400 });
  }

  const targetFilePath = path.join(targetDir, safeRelativePath);
  fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });

  const tempFilePath = `${targetFilePath}.part`;
  const finalFilePath = targetFilePath;

  try {
    if (chunkIndex === 0 && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    const rawBody = await req.arrayBuffer();
    const chunkBuffer = Buffer.from(rawBody);
    fs.writeFileSync(tempFilePath, chunkBuffer, { flag: "a" });

    if (chunkIndex === totalChunks - 1) {
      if (fs.existsSync(finalFilePath)) {
        fs.unlinkSync(finalFilePath);
      }
      fs.renameSync(tempFilePath, finalFilePath);
    }

    return NextResponse.json({ ok: true });
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

  fs.mkdirSync(MEDIA_STORAGE_DIR, { recursive: true });

  const formData = await req.formData();
  const fields: Record<string, string> = {};
  const uploadedFiles: Array<{ fieldName: string; file: File }> = [];
  let folderName = `media-${Date.now()}`;
  let targetMediaDir = "";

  const createMediaDir = (rawFolderName: unknown) => {
    folderName = safeFolderName(rawFolderName);
    targetMediaDir = path.join(MEDIA_STORAGE_DIR, folderName);
    fs.mkdirSync(targetMediaDir, { recursive: true });
  };

  const appendFileFromFormEntry = async (entry: File, destPath: string) => {
    const buffer = Buffer.from(await entry.arrayBuffer());
    fs.writeFileSync(destPath, buffer);
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
    const mediaType = fields.mediaType === "series" ? "series" : "movie";
    const replaceMedia = fields.replaceMedia === "true";
    const existingFolder = fields.existingFolder || "";

    if (mode === "edit") {
      const sourceFolder = safeFolderName(existingFolder || fields.folderName || "media");
      const sourceDir = path.join(MEDIA_STORAGE_DIR, sourceFolder);
      const targetFolder = safeFolderName(fields.folderName || existingFolder || sourceFolder);
      const resolvedTargetDir = path.join(MEDIA_STORAGE_DIR, targetFolder);

      if (fs.existsSync(sourceDir) && sourceFolder !== targetFolder) {
        if (fs.existsSync(resolvedTargetDir)) {
          throw new Error("Target folder already exists");
        }
        fs.renameSync(sourceDir, resolvedTargetDir);
      }

      targetMediaDir = fs.existsSync(resolvedTargetDir) ? resolvedTargetDir : sourceDir;
      fs.mkdirSync(targetMediaDir, { recursive: true });

      if (replaceMedia && mediaType !== "series") {
        removeExistingVideoFiles(targetMediaDir);
      }
    } else {
      createMediaDir(fields.folderName || folderName);
    }

    if (!targetMediaDir) {
      createMediaDir(fields.folderName || folderName);
    }

    for (const { fieldName, file } of uploadedFiles) {
      if (mode === "edit" && fieldName === "cover") {
        removeExistingImages(targetMediaDir);
      }

      const rawFilename = file.name || `${fieldName}-${Date.now()}`;
      const safeFilename = sanitizeName(rawFilename, getExtensionFromMime(file.type));
      const destPath = path.join(targetMediaDir, safeFilename);
      await appendFileFromFormEntry(file, destPath);
    }

    if (fields.info) {
      const infoPath = path.join(targetMediaDir, "info.json");
      fs.writeFileSync(infoPath, fields.info, "utf-8");
    }

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
