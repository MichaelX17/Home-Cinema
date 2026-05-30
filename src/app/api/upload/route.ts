import fs from "fs";
import path from "path";
import { Readable } from "stream";
// `busboy` is CJS; import dynamically to support ESM/CJS interop at runtime
import { NextResponse } from "next/server";

const sanitizeName = (name: string) =>
  name
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150) || `file-${Date.now()}`;

const safeFolderName = (folderName: string) => {
  const cleaned = sanitizeName(folderName || "media");
  return cleaned || `media-${Date.now()}`;
};

const writeFileFromStream = async (stream: NodeJS.ReadableStream, destPath: string) =>
  new Promise<void>((resolve, reject) => {
    const writeStream = fs.createWriteStream(destPath);
    stream.pipe(writeStream);
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
    stream.on("error", reject);
  });

export const runtime = "nodejs";

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { ok: false, error: "Content-Type must be multipart/form-data" },
      { status: 400 }
    );
  }

  const rawBody = req.body;
  if (!rawBody) {
    return NextResponse.json({ ok: false, error: "Request body is missing" }, { status: 400 });
  }

  const fields: Record<string, string> = {};
  const writePromises: Promise<void>[] = [];

  const nodeBody = Readable.fromWeb(rawBody as any);
  // dynamic import to handle CJS/ESM interop in Next's runtime
  const BusboyModule = await import("busboy");
  const BusboyCtor = (BusboyModule && (BusboyModule.default || BusboyModule)) as any;
  const busboy = new BusboyCtor({ headers: { "content-type": contentType } });

  let folderName = `media-${Date.now()}`;
  let mediaType = "movie";
  const mediaDirBase = path.join(process.cwd(), "public", "movies");
  let targetMediaDir = "";

  const createMediaDir = (rawFolderName: string) => {
    folderName = safeFolderName(rawFolderName);
    targetMediaDir = path.join(mediaDirBase, folderName);
    fs.mkdirSync(targetMediaDir, { recursive: true });
  };

  busboy.on("field", (fieldname: string, value: string) => {
    fields[fieldname] = value;
    if (fieldname === "folderName") {
      createMediaDir(value);
    } else if (fieldname === "mediaType") {
      mediaType = value || "movie";
    }
  });

  busboy.on(
    "file",
    (fieldname: string, file: NodeJS.ReadableStream, filename: string | undefined) => {
      const rawFilename = filename || `${fieldname}-${Date.now()}`;
      const safeFilename = sanitizeName(rawFilename);

    if (!targetMediaDir) {
      createMediaDir(fields.folderName || `media-${Date.now()}`);
    }

    if (fieldname === "infoFile") {
      const dest = path.join(
        targetMediaDir,
        rawFilename.toLowerCase().endsWith(".json") ? "info.json" : safeFilename
      );
      writePromises.push(writeFileFromStream(file, dest));
      return;
    }

    if (fieldname === "cover") {
      const dest = path.join(targetMediaDir, safeFilename);
      writePromises.push(writeFileFromStream(file, dest));
      return;
    }

    if (fieldname === "video") {
      const dest = path.join(targetMediaDir, safeFilename);
      writePromises.push(writeFileFromStream(file, dest));
      return;
    }

    if (fieldname.startsWith("season-")) {
      const season = fieldname.split("-")[1] || "1";
      const seasonDir = path.join(targetMediaDir, `season${season}`);
      fs.mkdirSync(seasonDir, { recursive: true });
      const dest = path.join(seasonDir, safeFilename);
      writePromises.push(writeFileFromStream(file, dest));
      return;
    }

    const dest = path.join(targetMediaDir, safeFilename);
    writePromises.push(writeFileFromStream(file, dest));
  });

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

    const infoPath = path.join(targetMediaDir, "info.json");
    if (fields.info) {
      fs.writeFileSync(infoPath, fields.info, "utf-8");
    }

    if (!fs.existsSync(infoPath)) {
      const fallback = {
        title: folderName.replace(/[-_]/g, " ").trim(),
        type: mediaType === "series" ? "series" : "movie",
      };
      fs.writeFileSync(infoPath, JSON.stringify(fallback, null, 2), "utf-8");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Upload error", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
