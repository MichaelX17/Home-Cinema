import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Tv, Film } from "lucide-react";

interface MediaItem {
  id: string;
  title: string;
  year?: string;
  duration?: string;
  cover: string;
  type: "movie" | "series";
}

interface MovieCardProps {
  item: MediaItem;
}

export default function MovieCard({ item }: MovieCardProps) {
  return (
    <Link href={`/movies/${item.id}`}>
      <Card className="group overflow-hidden bg-card border-border hover:border-primary transition-all duration-300 hover:shadow-lg">
        <div className="relative aspect-[2/3] overflow-hidden">
          {item.cover ? (
            <Image
              src={item.cover}
              alt={item.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center text-6xl text-muted-foreground">
              🎬
            </div>
          )}
          
          {/* Overlay with play button */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors duration-300 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
              <div className="bg-primary/90 text-primary-foreground rounded-full p-4">
                <Play className="h-8 w-8" />
              </div>
            </div>
          </div>
          
          {/* Type badge */}
          <div className="absolute top-2 left-2">
            <div className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 ${
              item.type === "movie" 
                ? "bg-blue-500/90 text-white" 
                : "bg-purple-500/90 text-white"
            }`}>
              {item.type === "movie" ? (
                <>
                  <Film className="h-3 w-3" />
                  Movie
                </>
              ) : (
                <>
                  <Tv className="h-3 w-3" />
                  Series
                </>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-lg truncate mb-1 group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>{item.year || "Unknown"}</span>
            {item.duration && item.type === "movie" && (
              <span>{item.duration}</span>
            )}
            {item.type === "series" && (
              <span className="flex items-center gap-1">
                <Tv className="h-3 w-3" />
                Series
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}