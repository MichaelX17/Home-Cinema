import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const mediaDir = path.join(process.cwd(), "public/movies");

    if (!fs.existsSync(mediaDir)) {
      return NextResponse.json([]);
    }

    const folders = fs.readdirSync(mediaDir).filter((folder) => {
      const folderPath = path.join(mediaDir, folder);
      return fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory();
    });

    const items = folders
      .map((folder) => {
        const folderPath = path.join(mediaDir, folder);
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

        if (type === "movie" && !videoFile) {
          return null;
        }

        return {
          id: folder,
          folderName: folder,
          title: metadata.title || folder.replace(/-/g, " "),
          year: metadata.year,
          duration: metadata.duration,
          description: metadata.description,
          cover: coverFile ? `/movies/${folder}/${coverFile}` : "",
          video: type === "movie" ? (videoFile ? `/movies/${folder}/${videoFile}` : "") : undefined,
          type,
        };
      })
      .filter(Boolean);

    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
