"use client";

import { useMemo, useState } from "react";
import MovieCard from "./MovieCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Movie {
  id: string;
  title: string;
  year?: string;
  duration?: string;
  description?: string;
  cover: string;
  video: string;
  folderName: string;
}

type SortMode = "az" | "za" | "newest" | "oldest";

export default function MovieCatalog({ movies }: { movies: Movie[] }) {
  const [sortMode, setSortMode] = useState<SortMode>("az");

  const sortedMovies = useMemo(() => {
    const list = [...movies];

    switch (sortMode) {
      case "az":
        return list.sort((a, b) =>
          a.title.localeCompare(b.title, "es", { sensitivity: "base" })
        );

      case "za":
        return list.sort((a, b) =>
          b.title.localeCompare(a.title, "es", { sensitivity: "base" })
        );

      case "newest":
        return list.sort(
          (a, b) => Number(b.year || 0) - Number(a.year || 0)
        );

      case "oldest":
        return list.sort(
          (a, b) => Number(a.year || 0) - Number(b.year || 0)
        );

      default:
        return list;
    }
  }, [movies, sortMode]);

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Catalog</h2>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Sort by:</span>

          <Select
            value={sortMode}
            onValueChange={(v) => setSortMode(v as SortMode)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="az">A–Z</SelectItem>
              <SelectItem value="za">Z–A</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10">
        {sortedMovies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </>
  );
}
