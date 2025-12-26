import fs from "fs";
import path from "path";
import HomeClient from "./components/HomeClient";

interface MediaItem {
  id: string;
  title: string;
  year?: string;
  duration?: string;
  description?: string;
  cover: string;
  video?: string;
  folderName: string;
  type: "movie" | "series";
}

function getMediaItems(): MediaItem[] {
  try {
    const mediaDir = path.join(process.cwd(), "public/movies");
    if (!fs.existsSync(mediaDir)) return [];

    return fs
      .readdirSync(mediaDir)
      .filter((folder) =>
        fs.statSync(path.join(mediaDir, folder)).isDirectory()
      )
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
            metadata = JSON.parse(
              fs.readFileSync(path.join(folderPath, jsonFile), "utf-8")
            );
          } catch { }
        }

        const rawType = metadata.type || "movie";
        const type = rawType === "serie" ? "series" : rawType;

        return {
          id: folder,
          folderName: folder,
          title: metadata.title || folder.replace(/-/g, " "),
          year: metadata.year,
          duration: metadata.duration,
          description: metadata.description,
          cover: coverFile ? `/movies/${folder}/${coverFile}` : "",
          video: type === "movie" ? (videoFile ? `/movies/${folder}/${videoFile}` : "") : "",
          type: type,
        };
      })
      .filter((item) => {
        if (item.type === "movie") {
          return item.video;
        }
        return true;
      });
  } catch {
    return [];
  }
}

export default function Home() {
  const mediaItems = getMediaItems();
  const movieCount = mediaItems.filter(item => item.type === "movie").length;
  const seriesCount = mediaItems.filter(item => item.type === "series").length;
  const totalCount = mediaItems.length;

  return (
    <HomeClient 
      mediaItems={mediaItems}
      movieCount={movieCount}
      seriesCount={seriesCount}
      totalCount={totalCount}
    />
  );
}