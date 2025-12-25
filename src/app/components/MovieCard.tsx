"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  return (
    <Link href={`/movies/${movie.folderName}`} className="group">
      <Card className="overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg">
        <CardHeader className="p-0">
          <div className="relative aspect-[2/3]">
            {movie.cover ? (
              <Image
                src={movie.cover}
                alt={movie.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground">
                🎬
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            {movie.duration && (
              <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium text-white">
                {movie.duration}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <h3 className="font-semibold text-base truncate group-hover:text-primary">
            {movie.title}
          </h3>
          {movie.year && (
            <p className="text-muted-foreground text-sm">{movie.year}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}