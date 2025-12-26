"use client";

import { useState } from "react";
import MovieCard from "./MovieCard";
import { Film, Tv } from "lucide-react";

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

interface MovieCatalogProps {
  mediaItems: MediaItem[];
}

export default function MovieCatalog({ mediaItems }: MovieCatalogProps) {
  const [filter, setFilter] = useState<"all" | "movies" | "series">("all");

  const filteredItems = mediaItems.filter((item) => {
    if (filter === "movies") return item.type === "movie";
    if (filter === "series") return item.type === "series";
    return true;
  });

  return (
    <div>
      {/* Filter buttons */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-full flex items-center gap-2 transition-colors ${
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary hover:bg-secondary/80"
          }`}
        >
          All Media
        </button>
        <button
          onClick={() => setFilter("movies")}
          className={`px-4 py-2 rounded-full flex items-center gap-2 transition-colors ${
            filter === "movies"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary hover:bg-secondary/80"
          }`}
        >
          <Film className="h-4 w-4" />
          Movies
        </button>
        <button
          onClick={() => setFilter("series")}
          className={`px-4 py-2 rounded-full flex items-center gap-2 transition-colors ${
            filter === "series"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary hover:bg-secondary/80"
          }`}
        >
          <Tv className="h-4 w-4" />
          Series
        </button>
      </div>

      {/* Media grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredItems.map((item) => (
          <MovieCard key={item.id} item={item} />
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-fit p-4 bg-secondary rounded-full mb-4">
            <Tv className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No {filter === "all" ? "media" : filter} found</h3>
          <p className="text-muted-foreground">
            Try changing your filter or add more content.
          </p>
        </div>
      )}
    </div>
  );
}