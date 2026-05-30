import fs from "fs";
import path from "path";
import { pipeline, Readable } from "stream";
import { promisify } from "util";
import { NextResponse } from "next/server";

const pipelineAsync = promisify(pipeline);

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

const writeStreamToFile = async (file: any, destPath: string) => {
  const stream = file.stream();
  if (!stream) {
    throw new Error("Unable to read file stream");
  }

  const nodeStream = Readable.fromWeb(stream as any);
  const writeStream = fs.createWriteStream(destPath);
  await pipelineAsync(nodeStream, writeStream);
};

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const mediaType = formData.get("mediaType")?.toString() || "movie";
    const rawFolderName = formData.get("folderName")?.toString() || `media-${Date.now()}`;
    const folderName = safeFolderName(rawFolderName);

    const mediaDir = path.join(process.cwd(), "public", "movies", folderName);
    fs.mkdirSync(mediaDir, { recursive: true });

    // Handle entries
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") continue;

      const maybeFile: any = value;
      if (!maybeFile || typeof maybeFile.arrayBuffer !== "function") continue;

      const rawFilename = maybeFile.name || `${key}-${Date.now()}`;
      const filename = sanitizeName(rawFilename);

      if (key === "infoFile") {
        const dest = path.join(
          mediaDir,
          rawFilename.toLowerCase().endsWith(".json") ? "info.json" : filename
        );
        await writeStreamToFile(maybeFile, dest);
        continue;
      }

      if (key === "cover") {
        await writeStreamToFile(maybeFile, path.join(mediaDir, filename));
        continue;
      }

      if (key === "video") {
        await writeStreamToFile(maybeFile, path.join(mediaDir, filename));
        continue;
      }

      if (key.startsWith("season-")) {
        const parts = key.split("-");
        const season = parts[1] || "1";
        const seasonDir = path.join(mediaDir, `season${season}`);
        fs.mkdirSync(seasonDir, { recursive: true });
        await writeStreamToFile(maybeFile, path.join(seasonDir, filename));
        continue;
      }

      await writeStreamToFile(maybeFile, path.join(mediaDir, filename));
    }

    const infoText = formData.get("info");
    if (infoText && typeof infoText === "string") {
      try {
        const dest = path.join(mediaDir, "info.json");
        fs.writeFileSync(dest, infoText, "utf-8");
      } catch (e) {
        console.error("Failed to write info text", e);
      }
    }

    const infoPath = path.join(mediaDir, "info.json");
    if (!fs.existsSync(infoPath)) {
      const fallback = {
        title: folderName.replace(/[-_]/g, " ").trim(),
        type: mediaType === "series" ? "series" : "movie",
      };
      fs.writeFileSync(infoPath, JSON.stringify(fallback, null, 2), "utf-8");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
