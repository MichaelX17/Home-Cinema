// src/types/media.ts
export type MediaType = "movie" | "series";

export interface BaseMedia {
  slug: string;
  title: string;
  description?: string;
  year?: string;
  genre?: string[];
  rating?: number;
  cover: string;
  type: MediaType;
}

export interface Movie extends BaseMedia {
  type: "movie";
  video: string;
  duration?: string;
}

export interface Episode {
  season: number;
  episode: number;
  src: string;
  title: string;
}

export interface Series extends BaseMedia {
  type: "series";
  seasons: {
    season: number;
    episodes: Episode[];
  }[];
}
