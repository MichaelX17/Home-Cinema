"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Film, Tv } from "lucide-react";
import MovieCatalog from "./MovieCatalog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface HomeClientProps {
  mediaItems: MediaItem[];
  movieCount: number;
  seriesCount: number;
  totalCount: number;
}

export default function HomeClient({ 
  mediaItems, 
  movieCount, 
  seriesCount, 
  totalCount 
}: HomeClientProps) {
  const [filter, setFilter] = useState<"all" | "movies" | "series">("all");
  const [sort, setSort] = useState<"a-z" | "z-a" | "newest" | "oldest">("a-z");

  // Aplicar filtro y ordenamiento
  const filteredItems = mediaItems.filter((item) => {
    if (filter === "movies") return item.type === "movie";
    if (filter === "series") return item.type === "series";
    return true;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sort) {
      case "a-z":
        return a.title.localeCompare(b.title);
      case "z-a":
        return b.title.localeCompare(a.title);
      case "newest":
        return (b.year || "").localeCompare(a.year || "");
      case "oldest":
        return (a.year || "").localeCompare(b.year || "");
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header - Rediseñado */}
        <header className="mb-12 pb-6 border-b border-border/60">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="text-center md:text-left mb-6 md:mb-0">
              <h1 className="text-5xl font-black tracking-tight text-white mb-3">
                Home Cinema
              </h1>
              <p className="text-muted-foreground text-lg">
                Your personal media collection has{" "}
                <span className="text-white font-semibold">{totalCount}</span> media products
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-secondary/60 backdrop-blur-md px-4 py-2 rounded-full border border-border">
                <Film className="h-5 w-5 text-primary" />
                <span className="text-white font-medium">{movieCount}</span>
              </div>
              <div className="flex items-center gap-2 bg-secondary/60 backdrop-blur-md px-4 py-2 rounded-full border border-border">
                <Tv className="h-5 w-5 text-primary" />
                <span className="text-white font-medium">{seriesCount}</span>
              </div>
            </div>
          </div>

          {/* Filtros y Ordenamiento */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Filtros de tipo */}
            <div className="flex gap-3">
              <button 
                onClick={() => setFilter("all")}
                className={`px-5 py-2.5 rounded-full flex items-center gap-2 transition-all duration-300 font-medium icon-interactive ${
                  filter === "all"
                    ? "bg-primary text-white hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                    : "bg-secondary/40 backdrop-blur-sm text-muted-foreground hover:text-white border border-primary/60 hover:border-primary/80 hover:bg-primary hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                }`}
              >
                All Media
              </button>
              <button 
                onClick={() => setFilter("movies")}
                className={`px-5 py-2.5 rounded-full flex items-center gap-2 transition-all duration-300 font-medium icon-interactive ${
                  filter === "movies"
                    ? "bg-primary text-white hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                    : "bg-secondary/40 backdrop-blur-sm text-muted-foreground hover:text-white border border-primary/60 hover:border-primary/80 hover:bg-primary hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                }`}
              >
                <Film className="h-4 w-4" />
                Movies
              </button>
              <button 
                onClick={() => setFilter("series")}
                className={`px-5 py-2.5 rounded-full flex items-center gap-2 transition-all duration-300 font-medium icon-interactive ${
                  filter === "series"
                    ? "bg-primary text-white hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                    : "bg-secondary/40 backdrop-blur-sm text-muted-foreground hover:text-white border border-primary/60 hover:border-primary/80 hover:bg-primary hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                }`}
              >
                <Tv className="h-4 w-4" />
                Series
              </button>
            </div>

            {/* Select para ordenar */}
            <div className="w-full md:w-auto min-w-[200px]">
              <Select 
                value={sort} 
                onValueChange={(value: "a-z" | "z-a" | "newest" | "oldest") => setSort(value)}
              >
                <SelectTrigger className="bg-secondary/60 backdrop-blur-md border border-border text-white hover:bg-secondary/70 transition-colors icon-interactive">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-card/90 backdrop-blur-md border border-border">
                  <SelectItem value="a-z" className="focus:bg-accent focus:text-accent-foreground cursor-pointer icon-interactive">
                    A-Z
                  </SelectItem>
                  <SelectItem value="z-a" className="focus:bg-accent focus:text-accent-foreground cursor-pointer icon-interactive">
                    Z-A
                  </SelectItem>
                  <SelectItem value="newest" className="focus:bg-accent focus:text-accent-foreground cursor-pointer icon-interactive">
                    Newest
                  </SelectItem>
                  <SelectItem value="oldest" className="focus:bg-accent focus:text-accent-foreground cursor-pointer icon-interactive">
                    Oldest
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        <main>
          {sortedItems.length === 0 ? (
            <div className="text-center py-20">
              <div className="mx-auto w-fit p-4 bg-secondary/60 backdrop-blur-md rounded-full mb-6 border border-border icon-interactive">
                <Film className="h-16 w-16 text-primary" />
              </div>

              <h2 className="text-3xl font-bold mb-2 text-white">No media found</h2>

              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                To get started, add some movies or series to the{" "}
                <code className="bg-muted/50 px-2 py-1 rounded-md font-mono text-sm text-white icon-interactive">
                  public/movies/
                </code>{" "}
                directory on your server.
              </p>

              <Card className="max-w-lg mx-auto text-left bg-card/60 backdrop-blur-md border border-border">
                <CardHeader>
                  <h3 className="font-semibold text-lg text-primary">
                    Example File Structure
                  </h3>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-md overflow-x-auto border border-border">
                    <code className="icon-interactive">
                      {`public/movies/
├── movie-folder/
│   ├── cover.jpg
│   ├── info.json    # type: "movie"
│   └── video.mp4
└── series-folder/
    ├── cover.jpg
    ├── info.json    # type: "series" (o "serie")
    ├── season01/
    │   ├── episode01.mp4
    │   └── episode02.mp4
    └── season02/
        ├── episode01.mp4
        └── episode02.mp4`}
                    </code>
                  </pre>
                </CardContent>
              </Card>
            </div>
          ) : (
            <MovieCatalog mediaItems={sortedItems} />
          )}
        </main>

        <footer className="border-t border-border/60 mt-16 pt-8">
          <div className="text-center text-muted-foreground text-sm">
            <p>
              <span className="font-bold text-primary icon-interactive">Home Cinema</span> • For
              Personal Use Only • {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}