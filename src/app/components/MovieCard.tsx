"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PlayCircle, Calendar, Clock } from "lucide-react";
import { useState } from "react";

interface MovieCardProps {
  movie: {
    id: string;
    title: string;
    year?: string;
    duration?: string;
    description?: string;
    cover: string;
    video: string;
    folderName: string;
  };
}

export default function MovieCard({ movie }: MovieCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <Link
      href={`/movies/${movie.folderName}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
      aria-label={`Ver detalles de ${movie.title}`}
    >
      <Card className="relative overflow-hidden transition-all duration-300 ease-in-out bg-card border-border hover:border-primary/50 rounded-lg shadow-lg hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 h-full">
        {/* Badge de duración */}
        {movie.duration && (
          <div className="absolute top-3 right-3 z-20 bg-background/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium text-foreground flex items-center gap-1 shadow-sm">
            <Clock className="w-3 h-3" />
            {movie.duration}
          </div>
        )}

        {/* Indicador de play hover */}
        <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
          <PlayCircle className="w-12 h-12 text-white/90 drop-shadow-lg transform group-hover:scale-110 transition-transform" />
        </div>

        <CardHeader className="p-0">
          <div className="relative aspect-[2/3] overflow-hidden">
            {movie.cover && !imageError ? (
              <>
                <Image
                  src={movie.cover}
                  alt={`Portada de ${movie.title}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
                  priority={false}
                  loading="lazy"
                  onError={() => setImageError(true)}
                  quality={85}
                />
                {/* Gradient overlay solo en hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-secondary to-muted text-muted-foreground">
                <span className="text-5xl mb-2">🎬</span>
                <p className="text-sm px-4 text-center">No disponible</p>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-3">
          {/* Título con limitación de líneas */}
          <h3 
            className="font-semibold text-foreground line-clamp-2 min-h-[3.5rem] mb-2 transition-colors duration-300 group-hover:text-primary group-focus:text-primary"
            title={movie.title}
          >
            {movie.title}
          </h3>

          {/* Información adicional */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            {movie.year && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{movie.year}</span>
              </div>
            )}
            
            {/* Indicador de calidad si es video HD */}
            {movie.video && movie.video.includes("1080") && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                1080p
              </span>
            )}
          </div>

          {/* Descripción truncada (opcional) */}
          {movie.description && (
            <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
              {movie.description}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}