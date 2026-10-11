/**
 * Shared TypeScript types for media data across the Home Cinema app.
 * Centralized to prevent type drift between API, server components, and client components.
 */

// --- Scan result types ---

export interface ScanResult {
  folderName: string;
  coverFile: string | undefined;
  videoFile: string | undefined;
  effectiveVideoFile: string | undefined;
  metadata: Metadata;
  type: "movie" | "series";
  seasonNumbers: number[];
}

// --- Metadata (from info.json) ---

export interface Metadata {
  title?: string;
  year?: number | string;
  duration?: string;
  description?: string;
  genre?: string[];
  director?: string;
  actors?: string[];
  rating?: number | string;
  type?: string;
  [key: string]: unknown;
}

// --- Episode & Season (series only) ---

export interface EpisodeInfo {
  number: number;
  title: string;
  file: string;
  seasonNumber: number;
}

export interface SeasonInfo {
  number: number;
  episodes: EpisodeInfo[];
}

// --- Catalog / API item (GET /api/media response) ---

export interface MediaCatalogItem {
  id: string;
  folderName: string;
  title: string;
  year?: number | string;
  duration?: string;
  description?: string;
  infoJson?: string;
  seasons?: number[];
  cover: string;
  video?: string;
  type: "movie" | "series";
}

// --- Detail page types (getMedia return) ---

export interface MovieDetail {
  slug: string;
  title: string;
  year?: number | string;
  duration?: string;
  description?: string;
  genre?: string[];
  director?: string;
  actors?: string[];
  rating?: number | string;
  cover: string;
  video: string;
  type: "movie";
}

export interface SeriesDetail {
  slug: string;
  title: string;
  year?: number | string;
  description?: string;
  genre?: string[];
  director?: string;
  actors?: string[];
  rating?: number | string;
  cover: string;
  type: "series";
  seasons: SeasonInfo[];
  totalSeasons: number;
  totalEpisodes: number;
}

export type MediaDetail = MovieDetail | SeriesDetail;

// --- Modal edit item ---

export interface MediaItemForModal {
  folderName: string;
  title: string;
  description?: string;
  infoJson?: string;
  seasons?: number[];
  type: "movie" | "series";
}

// --- Card / catalog list item (minimal) ---

export interface MediaCardItem {
  id: string;
  title: string;
  year?: number | string;
  cover: string;
  folderName: string;
  type: "movie" | "series";
}