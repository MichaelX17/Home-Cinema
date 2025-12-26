"use client";

import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";

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
}

export default function MovieCard({ item }: MovieCardProps) {
  return (
    <Link href={`/movies/${item.folderName}`}>
      <div className="group relative bg-card rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.04] hover:ring-2 hover:ring-primary hover:shadow-[0_0_35px_rgba(80,120,255,0.45)] cursor-pointer">
        {/* Imagen de portada */}
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
            <div className="w-full h-full bg-secondary flex items-center justify-center">
              <span className="text-muted-foreground">No image</span>
            </div>
          )}

          {/* Overlay gradiente */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Icono de play animado */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
            <div className="bg-white/90 p-4 rounded-full shadow-lg">
              <Play className="h-8 w-8 text-black" fill="black" />
            </div>
          </div>

          {/* Información (título y año) */}
          <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <h3 className="text-white font-bold text-lg line-clamp-1">
              {item.title}
            </h3>
            {item.year && (
              <p className="text-muted-foreground text-sm">{item.year}</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}