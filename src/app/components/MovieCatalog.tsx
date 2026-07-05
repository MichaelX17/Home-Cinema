"use client";

import MovieCard from "./MovieCard";
import { Tv } from "lucide-react";

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
  onEdit: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
}

export default function MovieCatalog({ mediaItems, onEdit, onDelete }: MovieCatalogProps) {
  return (
    <div>
      {/* Media grid con responsive design actualizado */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {mediaItems.map((item) => (
          <MovieCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>

      {mediaItems.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-fit p-4 bg-secondary/60 backdrop-blur-md rounded-full mb-4 border border-border">
            <Tv className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-white">
            No media found
          </h3>
          <p className="text-muted-foreground">
            Try changing your filter or add more content.
          </p>
        </div>
      )}
    </div>
  );
}