"use client";

import Image from "next/image";
import Link from "next/link";
import { Pencil, Play, Trash2 } from "lucide-react";

interface MediaItem {
  id: string;
  title: string;
  year?: string;
  cover: string;
  folderName: string;
  type: "movie" | "series";
}

interface MovieCardProps {
  item: MediaItem;
  onEdit: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
}

export default function MovieCard({ item, onEdit, onDelete }: MovieCardProps) {
  return (
    <div className="group relative">
      <div className="absolute right-2 top-2 z-10 flex gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <button
          type="button"
          className="rounded-full border border-border/70 bg-black/70 p-2 text-white backdrop-blur transition hover:bg-primary"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onEdit(item);
          }}
          aria-label={`Edit ${item.title}`}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded-full border border-red-500/40 bg-black/70 p-2 text-white backdrop-blur transition hover:bg-red-600"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete(item);
          }}
          aria-label={`Remove ${item.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <Link href={`/movies/${item.folderName}`} className="block">
        <div className="overflow-hidden rounded-xl bg-card transition-all duration-300 hover:scale-[1.04] hover:shadow-[0_0_35px_rgba(80,120,255,0.45)] hover:ring-2 hover:ring-primary">
          <div className="relative aspect-[2/3] w-full">
            {item.cover ? (
              <Image
                src={item.cover}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-secondary">
                <span className="text-muted-foreground">No image</span>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            <div className="absolute inset-0 flex scale-75 items-center justify-center opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
              <div className="rounded-full bg-white/90 p-4 shadow-lg">
                <Play className="h-8 w-8 text-black" fill="black" />
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <h3 className="line-clamp-1 text-lg font-bold text-white">{item.title}</h3>
              {item.year && <p className="text-sm text-muted-foreground">{item.year}</p>}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}