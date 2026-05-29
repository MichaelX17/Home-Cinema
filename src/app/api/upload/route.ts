import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const mediaType = formData.get("mediaType")?.toString() || "movie";
    const folderName = formData.get("folderName")?.toString() || `media-${Date.now()}`;

    const mediaDir = path.join(process.cwd(), "public", "movies", folderName);
    fs.mkdirSync(mediaDir, { recursive: true });

    // Handle entries
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") continue;

      // value is a File-like object (web File/Blob)
      // detect file-like by presence of arrayBuffer
      const maybeFile: any = value;
      if (!maybeFile || typeof maybeFile.arrayBuffer !== "function") continue;

      const filename = maybeFile.name || `${key}-${Date.now()}`;
      const buffer = Buffer.from(await maybeFile.arrayBuffer());

      if (key === "infoFile") {
        // save as info.json if possible
        const dest = path.join(mediaDir, filename.toLowerCase().endsWith(".json") ? "info.json" : filename);
        fs.writeFileSync(dest, buffer);
        continue;
      }

      if (key === "cover") {
        fs.writeFileSync(path.join(mediaDir, filename), buffer);
        continue;
      }

      if (key === "video") {
        fs.writeFileSync(path.join(mediaDir, filename), buffer);
        continue;
      }

      // season files: keys like season-1
      if (key.startsWith("season-")) {
        const parts = key.split("-");
        const season = parts[1] || "1";
        const seasonDir = path.join(mediaDir, `season${season}`);
        fs.mkdirSync(seasonDir, { recursive: true });
        fs.writeFileSync(path.join(seasonDir, filename), buffer);
        continue;
      }

      // generic fallback
      fs.writeFileSync(path.join(mediaDir, filename), buffer);
    }

    // if info text field provided
    const infoText = formData.get("info");
    if (infoText && typeof infoText === "string") {
      try {
        const dest = path.join(mediaDir, "info.json");
        fs.writeFileSync(dest, infoText, "utf-8");
      } catch (e) {
        // ignore
      }
    }

    // create a minimal metadata.json if none exists
    const infoPath = path.join(mediaDir, "info.json");
    if (!fs.existsSync(infoPath)) {
      const fallback = {
        title: folderName.replace(/[-_]/g, " "),
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
