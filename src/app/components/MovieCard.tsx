"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

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
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link href={`/movies/${movie.folderName}`}>
      <div
        className="group cursor-pointer transition-all duration-300 hover:scale-105"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative overflow-hidden rounded-xl aspect-[2/3] mb-3 bg-gradient-to-br from-gray-900 to-black">
          {movie.cover ? (
            <Image
              src={movie.cover}
              alt={movie.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              🎬
            </div>
          )}
          
          {/* Overlay de reproducción */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100 bg-black/50' : 'opacity-0'}`}>
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <div className="w-0 h-0 border-t-[12px] border-b-[12px] border-l-[20px] border-transparent border-l-white ml-1" />
            </div>
          </div>
          
          {/* Badge de duración */}
          {movie.duration && (
            <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium">
              {movie.duration}
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <h3 className="font-semibold text-lg truncate">{movie.title}</h3>
          {movie.year && (
            <p className="text-gray-400 text-sm">{movie.year}</p>
          )}
        </div>
      </div>
    </Link>
  );
}