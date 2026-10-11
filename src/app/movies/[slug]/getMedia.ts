import fsPromises from "fs/promises";
import path from "path";
import type { MediaDetail } from "@/types/media";
import {
  fsExists,
  fsStatOrNull,
  scanMediaFolder,
  scanSeriesSeasons,
  buildCoverUrl,
  buildTitleFromFolder,
} from "@/lib/media-scanner";

export async function getMedia(slug: string): Promise<MediaDetail | null> {
  try {
    const mediaDir = path.join(process.cwd(), "../movies-files", slug);
    if (!(await fsExists(mediaDir))) {
      return null;
    }

    const scanResult = await scanMediaFolder(mediaDir);

    const { coverFile, effectiveVideoFile, metadata, type, folderName } = scanResult;

    if (type === "movie") {
      return {
        slug,
        title: buildTitleFromFolder(folderName, metadata.title),
        year: metadata.year,
        duration: metadata.duration,
        description: metadata.description,
        genre: metadata.genre || [],
        director: metadata.director,
        actors: metadata.actors || [],
        rating: metadata.rating,
        cover: buildCoverUrl(slug, coverFile),
        video: effectiveVideoFile
          ? `/api/videos/${encodeURIComponent(`${slug}/${effectiveVideoFile}`)}`
          : "",
        type: "movie",
      };
    }

    if (type === "series") {
      const seasons = await scanSeriesSeasons(mediaDir, slug);

      return {
        slug,
        title: buildTitleFromFolder(folderName, metadata.title),
        year: metadata.year,
        description: metadata.description,
        genre: metadata.genre || [],
        director: metadata.director,
        actors: metadata.actors || [],
        rating: metadata.rating,
        cover: buildCoverUrl(slug, coverFile),
        type: "series",
        seasons,
        totalSeasons: seasons.length,
        totalEpisodes: seasons.reduce((total, season) => total + season.episodes.length, 0),
      };
    }

    return null;
  } catch (error) {
    console.error(`Error obteniendo media ${slug}:`, error);
    return null;
  }
}

export async function generateStaticParams() {
  const moviesDir = path.join(process.cwd(), "../movies-files");

  if (!(await fsExists(moviesDir))) {
    return [];
  }

  const movieFolders = await fsPromises.readdir(moviesDir);

  const folderEntries = await Promise.all(
    movieFolders.map(async (folder) => {
      const folderPath = path.join(moviesDir, folder);
      const stat = await fsStatOrNull(folderPath);
      return stat && stat.isDirectory() ? { slug: folder } : null;
    })
  );

  return folderEntries.filter(Boolean) as { slug: string }[];
}