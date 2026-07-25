import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MEDIA_BASE_DIR = path.join(process.cwd(), "../movies-files");

export function GET() {
  try {
    if (!fs.existsSync(MEDIA_BASE_DIR)) {
      return NextResponse.json([]);
    }

    const folders = fs.readdirSync(MEDIA_BASE_DIR).filter((folder) => {
      const folderPath = path.join(MEDIA_BASE_DIR, folder);
      return fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory();
    });

    const items = folders
      .map((folder) => {
        const folderPath = path.join(MEDIA_BASE_DIR, folder);
        const files = fs.readdirSync(folderPath);

        const coverFile = files.find(
          (f) =>
            f.toLowerCase().includes("cover") ||
            f.toLowerCase().includes("poster") ||
            /\.(jpg|jpeg|png|webp)$/i.test(f)
        );

        const videoFile = files.find(
          (f) =>
            f.toLowerCase().includes("movie") ||
            f.toLowerCase().includes("video") ||
            /\.(mp4|mkv|avi|mov|webm)$/i.test(f)
        );

        const fallbackVideoFile = !videoFile
          ? files.find(
              (f) =>
                !f.toLowerCase().includes("cover") &&
                !f.toLowerCase().includes("poster") &&
                !/\.(jpg|jpeg|png|webp)$/i.test(f) &&
                !f.endsWith(".json")
            )
          : undefined;

        const effectiveVideoFile = videoFile || fallbackVideoFile;

        let metadata: Record<string, any> = {};
        const jsonFile = files.find((f) => f.endsWith(".json"));
        if (jsonFile) {
          try {
            metadata = JSON.parse(fs.readFileSync(path.join(folderPath, jsonFile), "utf-8"));
          } catch {
            metadata = {};
          }
        }

        const rawType = metadata.type || "movie";
        const type = rawType === "serie" ? "series" : rawType;
        const infoJsonPath = path.join(folderPath, "info.json");
        const infoJson = fs.existsSync(infoJsonPath) ? fs.readFileSync(infoJsonPath, "utf-8") : "";
        const existingSeasonNumbers = fs
          .readdirSync(folderPath, { withFileTypes: true })
          .filter((entry) => entry.isDirectory() && /^season-(\d+)$/i.test(entry.name))
          .map((entry) => Number(entry.name.match(/season-(\d+)/i)?.[1]))
          .filter((value) => Number.isInteger(value))
          .sort((a, b) => a - b);

        if (type === "movie" && !effectiveVideoFile) {
          return null;
        }

        return {
          id: folder,
          folderName: folder,
          title: metadata.title || folder.replace(/-/g, " "),
          year: metadata.year,
          duration: metadata.duration,
          description: metadata.description,
          infoJson,
          seasons: existingSeasonNumbers,
          cover: coverFile ? `/api/videos/${encodeURIComponent(`${folder}/${coverFile}`)}` : "",
          video:
            type === "movie"
              ? effectiveVideoFile
                ? `/api/videos/${encodeURIComponent(`${folder}/${effectiveVideoFile}`)}`
                : ""
              : undefined,
          type,
        };
      })
      .filter(Boolean);

    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const folderName = String(url.searchParams.get("folderName") || "").trim();

    if (!folderName) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }

    const targetPath = path.join(MEDIA_BASE_DIR, folderName);
    if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
      return NextResponse.json({ error: "Media folder not found" }, { status: 404 });
    }

    fs.rmSync(targetPath, { recursive: true, force: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
