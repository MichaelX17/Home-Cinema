import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MEDIA_STORAGE_DIR = path.join(process.cwd(), "../videos-almacenamiento");

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
    .replace(/[\/\\?%*:|"<>]/g, "-")
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

const writeFileFromStream = async (stream: NodeJS.ReadableStream, destPath: string, flags: string = "w") =>
  new Promise<void>((resolve, reject) => {
    const writeStream = fs.createWriteStream(destPath, { flags });
    stream.pipe(writeStream);
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
    stream.on("error", reject);
  });

const streamRequestBodyToFile = async (req: Request, destPath: string, append = false) => {
  if (!req.body) {
    throw new Error("Request body is missing");
  }

  const bodyStream = Readable.fromWeb(req.body as any);
  await writeFileFromStream(bodyStream, destPath, append ? "a" : "w");
};

const getOriginalFilename = (
  filename: unknown,
  fieldname: string,
  mimeType?: string
): string => {
  let original = "";

  if (typeof filename === "string") {
    original = filename;
  } else if (filename && typeof filename === "object") {
    if ("name" in filename && typeof filename.name === "string") original = filename.name;
    else if ("filename" in filename && typeof filename.filename === "string") original = filename.filename;
  }

  if (original.trim()) {
    return original;
  }

  const ext = getExtensionFromMime(mimeType);
  return `${fieldname}-${Date.now()}${ext}`;
};

const handleChunkUpload = async (req: Request) => {
  const fileNameHeader = req.headers.get("x-file-name");
  const chunkIndexHeader = req.headers.get("x-chunk-index");
  const totalChunksHeader = req.headers.get("x-total-chunks");
  const folderHeader = req.headers.get("x-folder-name");

  if (!fileNameHeader || chunkIndexHeader === null || totalChunksHeader === null) {
    return NextResponse.json(
      { ok: false, error: "Missing chunk headers x-file-name, x-chunk-index or x-total-chunks." },
      { status: 400 }
    );
  }

  const chunkIndex = Number(chunkIndexHeader);
  const totalChunks = Number(totalChunksHeader);
  if (!Number.isInteger(chunkIndex) || !Number.isInteger(totalChunks) || totalChunks <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid chunk index or total chunks." }, { status: 400 });
  }

  const folderName = folderHeader ? safeFolderName(folderHeader) : "";
  const targetDir = folderName ? path.join(MEDIA_STORAGE_DIR, folderName) : MEDIA_STORAGE_DIR;
  fs.mkdirSync(targetDir, { recursive: true });

  const filePathHeader = req.headers.get("x-file-path") || fileNameHeader;
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

    await streamRequestBodyToFile(req, tempFilePath, true);

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
  let folderName = `media-${Date.now()}`;
  let targetMediaDir = "";

  const createMediaDir = (rawFolderName: unknown) => {
    folderName = safeFolderName(rawFolderName);
    targetMediaDir = path.join(MEDIA_STORAGE_DIR, folderName);
    fs.mkdirSync(targetMediaDir, { recursive: true });
  };

  const appendFileFromFormEntry = async (entry: File, destPath: string) => {
    const stream = entry.stream();
    await writeFileFromStream(stream as any, destPath);
  };

  try {
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        fields[key] = value;
        if (key === "folderName") {
          createMediaDir(value);
        }
        continue;
      }

      if (value instanceof File) {
        if (!targetMediaDir) {
          createMediaDir(fields.folderName || `media-${Date.now()}`);
        }

        const rawFilename = value.name || `${key}-${Date.now()}`;
        const safeFilename = sanitizeName(rawFilename, getExtensionFromMime(value.type));
        const destPath = path.join(targetMediaDir, safeFilename);
        await appendFileFromFormEntry(value, destPath);
        continue;
      }
    }

    if (!targetMediaDir) {
      createMediaDir(fields.folderName || `media-${Date.now()}`);
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
