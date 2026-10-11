import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import type {
  EpisodeInfo,
  Metadata,
  ScanResult,
  SeasonInfo,
} from "@/types/media";

export async function fsExists(filePath: string): Promise<boolean> {
  try {
    await fsPromises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function fsStatOrNull(filePath: string): Promise<fs.Stats | null> {
  try {
    return await fsPromises.stat(filePath);
  } catch {
    return null;
  }
}

export function findCoverFile(files: string[]): string | undefined {
  return files.find(
    (f) =>
      f.toLowerCase().includes("cover") ||
      f.toLowerCase().includes("poster") ||
      /\.(jpg|jpeg|png|webp)$/i.test(f)
  );
}

export function findVideoFile(files: string[]): string | undefined {
  return files.find(
    (f) =>
      f.toLowerCase().includes("movie") ||
      f.toLowerCase().includes("video") ||
      /\.(mp4|mkv|avi|mov|webm)$/i.test(f)
  );
}

export function findFallbackVideoFile(files: string[], videoFile: string | undefined): string | undefined {
  if (videoFile) return undefined;
  return files.find(
    (f) =>
      !f.toLowerCase().includes("cover") &&
      !f.toLowerCase().includes("poster") &&
      !/\.(jpg|jpeg|png|webp)$/i.test(f) &&
      !f.endsWith(".json")
  );
}

export function getEffectiveVideoFile(videoFile: string | undefined, fallbackVideoFile: string | undefined): string | undefined {
  return videoFile || fallbackVideoFile;
}

export function findJsonFile(files: string[]): string | undefined {
  return files.find((f) => f.endsWith(".json"));
}

export async function readMetadata(folderPath: string, jsonFile: string | undefined): Promise<Metadata> {
  if (!jsonFile) return {};
  try {
    const jsonPath = path.join(folderPath, jsonFile);
    const jsonContent = await fsPromises.readFile(jsonPath, "utf-8");
    return JSON.parse(jsonContent);
  } catch {
    return {};
  }
}

export function normalizeType(rawType: string | undefined): "movie" | "series" {
  const type = rawType || "movie";
  return type === "serie" ? "series" : (type === "series" ? "series" : "movie");
}

export function extractSeasonNumber(folderName: string): number | null {
  const match = folderName.match(/season[^\d]*(\d+)/i);
  if (match) return parseInt(match[1], 10);
  return null;
}

export function extractEpisodeNumber(fileName: string): number | null {
  const sxxexx = fileName.match(/[sS](\d+)[eE](\d+)/);
  if (sxxexx) return parseInt(sxxexx[2], 10);

  const eMatch = fileName.match(/[eE](\d+)/);
  if (eMatch) return parseInt(eMatch[1], 10);

  const numMatch = fileName.match(/(\d+)/);
  return numMatch ? parseInt(numMatch[1], 10) : null;
}

export function sortSeasonFolders(folders: string[]): string[] {
  return [...folders].sort((a, b) => {
    const numA = extractSeasonNumber(a);
    const numB = extractSeasonNumber(b);
    if (numA !== null && numB !== null) {
      return numA - numB;
    }
    const nameA = a.toLowerCase();
    const nameB = b.toLowerCase();
    const cmp = nameA.localeCompare(nameB);
    if (cmp !== 0) return cmp;
    const fallbackA = parseInt(a.replace(/\D/g, "")) || 0;
    const fallbackB = parseInt(b.replace(/\D/g, "")) || 0;
    return fallbackA - fallbackB;
  });
}

export function sortEpisodeFiles(files: string[]): string[] {
  return [...files].sort((a, b) => {
    const numA = extractEpisodeNumber(a);
    const numB = extractEpisodeNumber(b);
    if (numA !== null && numB !== null) {
      return numA - numB;
    }
    const nameA = a.toLowerCase();
    const nameB = b.toLowerCase();
    const cmp = nameA.localeCompare(nameB);
    if (cmp !== 0) return cmp;
    const fallbackA = parseInt(a.replace(/\D/g, "")) || 0;
    const fallbackB = parseInt(b.replace(/\D/g, "")) || 0;
    return fallbackA - fallbackB;
  });
}

export function buildCoverUrl(slug: string, coverFile: string | undefined): string {
  if (!coverFile) return "";
  return `/api/videos/${encodeURIComponent(`${slug}/${coverFile}`)}`;
}

export function buildVideoUrl(slug: string, videoFile: string | undefined): string {
  if (!videoFile) return "";
  return `/api/videos/${encodeURIComponent(`${slug}/${videoFile}`)}`;
}

export function buildEpisodeUrl(slug: string, seasonFolder: string, file: string): string {
  return `/api/videos/${encodeURIComponent(`${slug}/${seasonFolder}/${file}`)}`;
}

export function buildTitleFromFolder(folderName: string, metadataTitle?: string): string {
  return metadataTitle || folderName.replace(/-/g, " ");
}

export async function scanMediaFolder(folderPath: string): Promise<ScanResult> {
  const files = await fsPromises.readdir(folderPath);

  const coverFile = findCoverFile(files);
  const videoFile = findVideoFile(files);
  const fallbackVideoFile = findFallbackVideoFile(files, videoFile);
  const effectiveVideoFile = getEffectiveVideoFile(videoFile, fallbackVideoFile);
  const jsonFile = findJsonFile(files);

  const metadata = await readMetadata(folderPath, jsonFile);
  const type = normalizeType(metadata.type as string | undefined);

  const entries = await fsPromises.readdir(folderPath, { withFileTypes: true });
  const existingSeasonNumbers = entries
    .filter((entry) => entry.isDirectory() && /^season-(\d+)$/i.test(entry.name))
    .map((entry) => Number(entry.name.match(/season-(\d+)/i)?.[1]))
    .filter((value) => Number.isInteger(value))
    .sort((a, b) => a - b);

  const folderName = path.basename(folderPath);

  return {
    folderName,
    coverFile,
    videoFile,
    effectiveVideoFile,
    metadata,
    type,
    seasonNumbers: existingSeasonNumbers,
  };
}

export async function scanSeriesSeasons(mediaDir: string, slug: string): Promise<SeasonInfo[]> {
  const files = await fsPromises.readdir(mediaDir);

  const seasonFolderCandidates = await Promise.all(
    files.map(async (f) => {
      const folderPath = path.join(mediaDir, f);
      const stat = await fsStatOrNull(folderPath);
      if (stat && stat.isDirectory() && f.toLowerCase().includes("season")) {
        return f;
      }
      return null;
    })
  );

  const seasonFolders = seasonFolderCandidates
    .filter((f): f is string => f !== null)
    .sort((a, b) => {
      const numA = extractSeasonNumber(a);
      const numB = extractSeasonNumber(b);
      if (numA !== null && numB !== null) {
        return numA - numB;
      }
      const nameA = a.toLowerCase();
      const nameB = b.toLowerCase();
      const cmp = nameA.localeCompare(nameB);
      if (cmp !== 0) return cmp;
      const fallbackA = parseInt(a.replace(/\D/g, "")) || 0;
      const fallbackB = parseInt(b.replace(/\D/g, "")) || 0;
      return fallbackA - fallbackB;
    });

  const seasons: SeasonInfo[] = [];

  for (const [index, seasonFolder] of seasonFolders.entries()) {
    const seasonPath = path.join(mediaDir, seasonFolder);
    const seasonFiles = await fsPromises.readdir(seasonPath);
    const seasonNumber = extractSeasonNumber(seasonFolder) ?? index + 1;

    const videoFiles = seasonFiles.filter((f) => /\.(mp4|mkv|avi|mov|webm)$/i.test(f));
    const sortedVideoFiles = sortEpisodeFiles(videoFiles);

    const episodes: EpisodeInfo[] = sortedVideoFiles.map((file, epIndex) => {
      const episodeNumber = extractEpisodeNumber(file) ?? epIndex + 1;
      return {
        number: episodeNumber,
        title: `Episode ${episodeNumber}`,
        file: buildEpisodeUrl(slug, seasonFolder, file),
        seasonNumber,
      };
    });

    seasons.push({
      number: seasonNumber,
      episodes,
    });
  }

  return seasons;
}