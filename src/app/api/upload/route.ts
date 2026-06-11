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

const writeFileFromStream = async (stream: NodeJS.ReadableStream, destPath: string, flags: string = "w") =>
  new Promise<void>((resolve, reject) => {
    const writeStream = fs.createWriteStream(destPath, { flags });
    stream.pipe(writeStream);
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
    stream.on("error", reject);
  });

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

const streamRequestBodyToFile = async (req: Request, destPath: string, append = false) => {
  const bodyStream = Readable.fromWeb(req.body as any);
  await writeFileFromStream(bodyStream, destPath, append ? "a" : "w");
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

  const safeFileName = sanitizeName(fileNameHeader);
  const tempFilePath = path.join(targetDir, `${safeFileName}.part`);
  const finalFilePath = path.join(targetDir, safeFileName);

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
  const headers = Object.fromEntries(req.headers.entries());
  const contentType = String(headers["content-type"] || headers["Content-Type"] || "");
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ ok: false, error: "Content-Type must be multipart/form-data." }, { status: 400 });
  }

  fs.mkdirSync(MEDIA_STORAGE_DIR, { recursive: true });

  const rawBody = req.body;
  if (!rawBody) {
    return NextResponse.json({ ok: false, error: "Request body is missing." }, { status: 400 });
  }

  const fields: Record<string, string> = {};
  const writePromises: Promise<void>[] = [];

  const nodeBody = Readable.fromWeb(rawBody as any);
  const BusboyModule = await import("busboy");
  const BusboyFactory = (BusboyModule && (BusboyModule.default || BusboyModule)) as any;
  const busboy = BusboyFactory({ headers });

  let folderName = `media-${Date.now()}`;
  let targetMediaDir = "";

  const createMediaDir = (rawFolderName: unknown) => {
    folderName = safeFolderName(rawFolderName);
    targetMediaDir = path.join(MEDIA_STORAGE_DIR, folderName);
    fs.mkdirSync(targetMediaDir, { recursive: true });
  };

  busboy.on("field", (fieldname: string, value: unknown) => {
    const stringValue = String(value ?? "");
    fields[fieldname] = stringValue;
    if (fieldname === "folderName") {
      createMediaDir(stringValue);
    }
  });

  busboy.on(
    "file",
    (
      fieldname: string,
      file: NodeJS.ReadableStream,
      filename: unknown,
      encoding: string,
      mimetype: string
    ) => {
      if (!targetMediaDir) {
        createMediaDir(fields.folderName || `media-${Date.now()}`);
      }

      const rawFilename = getOriginalFilename(filename, fieldname, mimetype);
      const safeFilename = sanitizeName(rawFilename, getExtensionFromMime(mimetype));
      const destPath = path.join(targetMediaDir, safeFilename);
      writePromises.push(writeFileFromStream(file, destPath));
    }
  );

  const busboyPromise = new Promise<void>((resolve, reject) => {
    busboy.on("finish", resolve);
    busboy.on("error", reject);
    nodeBody.pipe(busboy);
  });

  try {
    await busboyPromise;
    await Promise.all(writePromises);

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
