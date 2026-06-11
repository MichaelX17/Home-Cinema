import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const mediaBaseDir = path.join(process.cwd(), "../movies-files");

    if (!fs.existsSync(mediaBaseDir)) {
      return NextResponse.json([]);
    }

    const folders = fs.readdirSync(mediaBaseDir).filter((folder) => {
      const folderPath = path.join(mediaBaseDir, folder);
      return fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory();
    });

    const items = folders
      .map((folder) => {
        const folderPath = path.join(mediaBaseDir, folder);
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

        let metadata: any = {};
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
          cover: coverFile
            ? `/api/videos/${encodeURIComponent(`${folder}/${coverFile}`)}`
            : "",
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
