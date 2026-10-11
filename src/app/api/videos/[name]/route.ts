import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VIDEO_DIR = path.join(process.cwd(), "../movies-files");

const getMimeType = (filename: string) => {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    case ".mkv":
      return "video/x-matroska";
    case ".avi":
      return "video/x-msvideo";
    case ".ogg":
      return "video/ogg";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
};

const createWebStreamFromNode = (nodeStream: fs.ReadStream, request: NextRequest) => {
  let closed = false;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const closeController = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };

      const errorController = (err: unknown) => {
        if (closed) return;
        closed = true;
        controller.error(err);
      };

      nodeStream.on("data", (chunk) => {
        if (closed) return;
        const data = typeof chunk === "string" ? new TextEncoder().encode(chunk) : new Uint8Array(chunk);
        controller.enqueue(data);
      });

      nodeStream.on("end", closeController);
      nodeStream.on("close", closeController);
      nodeStream.on("error", errorController);

      request.signal.addEventListener(
        "abort",
        () => {
          nodeStream.destroy();
          closeController();
        },
        { once: true }
      );
    },
    cancel() {
      nodeStream.destroy();
    },
  });
};

export async function GET(request: NextRequest, context: { params: Promise<{ name: string }> }) {
  try {
    const params = await context.params;
    const rawName = params.name;
    if (!rawName) {
      return NextResponse.json({ error: "Video name is required" }, { status: 400 });
    }

    const safeName = decodeURIComponent(rawName);
    const filePath = path.join(VIDEO_DIR, safeName);
    const resolvedPath = path.resolve(filePath);
    const allowedBase = path.resolve(VIDEO_DIR);

    // Resolve symlinks on both paths to prevent symlink-based path traversal (Issue 1.1)
    let allowedBaseReal: string;
    try {
      allowedBaseReal = await fsPromises.realpath(allowedBase);
    } catch {
      return NextResponse.json({ error: "Media directory not found" }, { status: 404 });
    }

    let realPath: string;
    try {
      realPath = await fsPromises.realpath(resolvedPath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (!realPath.startsWith(allowedBaseReal + path.sep)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    let stat: fs.Stats;
    try {
      stat = await fsPromises.stat(realPath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (!stat.isFile()) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileSize = stat.size;
    const range = request.headers.get("range");
    const contentType = getMimeType(realPath);

    if (!range) {
      const headers = new Headers({
        "Content-Type": contentType,
        "Content-Length": String(fileSize),
        "Accept-Ranges": "bytes",
      });
      const stream = fs.createReadStream(realPath);
      const body = createWebStreamFromNode(stream, request);
      return new NextResponse(body, { status: 200, headers });
    }

    const bytesPrefix = "bytes=";
    if (!range.startsWith(bytesPrefix)) {
      return NextResponse.json({ error: "Invalid range header" }, { status: 416 });
    }

    const [startStr, endStr] = range.replace(bytesPrefix, "").split("-");
    const start = Number(startStr);
    const end = endStr ? Number(endStr) : fileSize - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= fileSize) {
      return NextResponse.json({ error: "Requested range not satisfiable" }, { status: 416 });
    }

    const chunkSize = end - start + 1;
    const headers = new Headers({
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": String(chunkSize),
      "Content-Type": contentType,
    });

    const stream = fs.createReadStream(realPath, { start, end });
    const body = createWebStreamFromNode(stream, request);
    return new NextResponse(body, { status: 206, headers });
  } catch (error) {
    console.error("Video stream error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
