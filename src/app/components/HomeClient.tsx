"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Film, Tv, Menu, X } from "lucide-react";
import MovieCatalog from "./MovieCatalog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
    <div className="min-h-dvh">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header - Optimizado para móvil */}
        <header className="mb-8 sm:mb-12 pb-4 sm:pb-6 border-b border-border/60">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 sm:mb-8">
            <div className="text-center md:text-left mb-4 sm:mb-6 md:mb-0 w-full md:w-auto">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-2 sm:mb-3">
                Home Cinema
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
                Your collection has{" "}
                <span className="text-white font-semibold">{totalCount}</span> media
              </p>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 mt-4 md:mt-0">
              <div className="flex items-center gap-1.5 sm:gap-2 bg-secondary/60 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-border text-sm sm:text-base">
                <Film className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span className="text-white font-medium">{movieCount}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 bg-secondary/60 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-border text-sm sm:text-base">
                <Tv className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span className="text-white font-medium">{seriesCount}</span>
              </div>
            </div>
          </div>

          {/* Filtros y Ordenamiento - Versión desktop */}
          <div className="hidden md:flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Filtros de tipo */}
            <div className="flex gap-3">
              <button 
                onClick={() => setFilter("all")}
                className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full flex items-center gap-2 transition-all duration-300 font-medium icon-interactive text-sm sm:text-base ${
                  filter === "all"
                    ? "bg-primary text-white hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                    : "bg-secondary/40 backdrop-blur-sm text-muted-foreground hover:text-white border border-primary/60 hover:border-primary/80 hover:bg-primary hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                }`}
              >
                All Media
              </button>
              <button 
                onClick={() => setFilter("movies")}
                className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full flex items-center gap-2 transition-all duration-300 font-medium icon-interactive text-sm sm:text-base ${
                  filter === "movies"
                    ? "bg-primary text-white hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                    : "bg-secondary/40 backdrop-blur-sm text-muted-foreground hover:text-white border border-primary/60 hover:border-primary/80 hover:bg-primary hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                }`}
              >
                <Film className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Movies</span>
                <span className="sm:hidden">Mov</span>
              </button>
              <button 
                onClick={() => setFilter("series")}
                className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full flex items-center gap-2 transition-all duration-300 font-medium icon-interactive text-sm sm:text-base ${
                  filter === "series"
                    ? "bg-primary text-white hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                    : "bg-secondary/40 backdrop-blur-sm text-muted-foreground hover:text-white border border-primary/60 hover:border-primary/80 hover:bg-primary hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                }`}
              >
                <Tv className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Series</span>
                <span className="sm:hidden">Ser</span>
              </button>
            </div>

            {/* Select para ordenar */}
            <div className="w-full md:w-auto min-w-[180px]">
              <Select 
                value={sort} 
                onValueChange={(value: "a-z" | "z-a" | "newest" | "oldest") => setSort(value)}
              >
                <SelectTrigger className="bg-secondary/60 backdrop-blur-md border border-border text-white hover:bg-secondary/70 transition-colors icon-interactive text-sm sm:text-base">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-card/90 backdrop-blur-md border border-border">
                  <SelectItem value="a-z" className="focus:bg-accent focus:text-accent-foreground cursor-pointer icon-interactive text-sm sm:text-base">
                    A-Z
                  </SelectItem>
                  <SelectItem value="z-a" className="focus:bg-accent focus:text-accent-foreground cursor-pointer icon-interactive text-sm sm:text-base">
                    Z-A
                  </SelectItem>
                  <SelectItem value="newest" className="focus:bg-accent focus:text-accent-foreground cursor-pointer icon-interactive text-sm sm:text-base">
                    Newest
                  </SelectItem>
                  <SelectItem value="oldest" className="focus:bg-accent focus:text-accent-foreground cursor-pointer icon-interactive text-sm sm:text-base">
                    Oldest
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Versión móvil/tablet para filtros */}
          <div className="md:hidden">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex-1 mr-3">
                  <Select 
                    value={sort} 
                    onValueChange={(value: "a-z" | "z-a" | "newest" | "oldest") => setSort(value)}
                  >
                    <SelectTrigger className="bg-secondary/60 backdrop-blur-md border border-border text-white hover:bg-secondary/70 transition-colors icon-interactive w-full text-sm">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent className="bg-card/90 backdrop-blur-md border border-border">
                      <SelectItem value="a-z" className="focus:bg-accent focus:text-accent-foreground cursor-pointer icon-interactive text-sm">
                        A-Z
                      </SelectItem>
                      <SelectItem value="z-a" className="focus:bg-accent focus:text-accent-foreground cursor-pointer icon-interactive text-sm">
                        Z-A
                      </SelectItem>
                      <SelectItem value="newest" className="focus:bg-accent focus:text-accent-foreground cursor-pointer icon-interactive text-sm">
                        Newest
                      </SelectItem>
                      <SelectItem value="oldest" className="focus:bg-accent focus:text-accent-foreground cursor-pointer icon-interactive text-sm">
                        Oldest
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  variant="outline"
                  size="sm"
                  className="icon-interactive border-border bg-secondary/60"
                >
                  {showMobileFilters ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Menu className="h-4 w-4" />
                  )}
                  <span className="ml-2 hidden xs:inline">
                    {showMobileFilters ? "Close" : "Filters"}
                  </span>
                </Button>
              </div>

              {/* Filtros móviles desplegables */}
              {showMobileFilters && (
                <div className="flex flex-wrap gap-2 p-3 bg-card/50 backdrop-blur-sm rounded-lg border border-border">
                  <button 
                    onClick={() => setFilter("all")}
                    className={`px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300 font-medium icon-interactive text-sm flex-1 min-w-[100px] justify-center ${
                      filter === "all"
                        ? "bg-primary text-white"
                        : "bg-secondary/40 text-muted-foreground border border-primary/60"
                    }`}
                  >
                    All Media
                  </button>
                  <button 
                    onClick={() => setFilter("movies")}
                    className={`px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300 font-medium icon-interactive text-sm flex-1 min-w-[100px] justify-center ${
                      filter === "movies"
                        ? "bg-primary text-white"
                        : "bg-secondary/40 text-muted-foreground border border-primary/60"
                    }`}
                  >
                    <Film className="h-3.5 w-3.5" />
                    Movies
                  </button>
                  <button 
                    onClick={() => setFilter("series")}
                    className={`px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300 font-medium icon-interactive text-sm flex-1 min-w-[100px] justify-center ${
                      filter === "series"
                        ? "bg-primary text-white"
                        : "bg-secondary/40 text-muted-foreground border border-primary/60"
                    }`}
                  >
                    <Tv className="h-3.5 w-3.5" />
                    Series
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main>
          {sortedItems.length === 0 ? (
            <div className="text-center py-12 sm:py-20">
              <div className="mx-auto w-fit p-4 bg-secondary/60 backdrop-blur-md rounded-full mb-4 sm:mb-6 border border-border icon-interactive">
                <Film className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-white">No media found</h2>

              <p className="text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto text-sm sm:text-base px-4">
                To get started, add some movies or series to the{" "}
                <code className="bg-muted/50 px-2 py-1 rounded-md font-mono text-xs sm:text-sm text-white icon-interactive">
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
                  <pre className="text-xs sm:text-sm text-muted-foreground bg-muted/30 p-3 sm:p-4 rounded-md overflow-x-auto border border-border">
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

        <footer className="border-t border-border/60 mt-12 sm:mt-16 pt-6 sm:pt-8">
          <div className="text-center text-muted-foreground text-xs sm:text-sm">
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