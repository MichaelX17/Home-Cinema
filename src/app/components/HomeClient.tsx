"use client";

import { useEffect, useState } from "react";
import { Film, Tv, Menu, X, Plus } from "lucide-react";
import UploadModal from "./UploadModal";
import MovieCatalog from "./MovieCatalog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface MediaItem {
  id: string;
  title: string;
  year?: string;
  duration?: string;
  description?: string;
  infoJson?: string;
  seasons?: number[];
  cover: string;
  video?: string;
  folderName: string;
  type: "movie" | "series";
}

export default function HomeClient() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "movies" | "series">("all");
  const [sort, setSort] = useState<"a-z" | "z-a" | "newest" | "oldest">("a-z");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);

  const loadMedia = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/media", { signal });
      if (!response.ok) {
        throw new Error(`Media request failed: ${response.status}`);
      }

      const data = await response.json();
      setMediaItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      setError("No se pudo cargar el catálogo. Recarga la página.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadMedia(controller.signal);
    return () => controller.abort();
  }, []);

  const movieCount = mediaItems.filter((item) => item.type === "movie").length;
  const seriesCount = mediaItems.filter((item) => item.type === "series").length;
  const totalCount = mediaItems.length;

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

  const openCreateModal = () => {
    setEditingItem(null);
    setShowUploadModal(true);
  };

  const openEditModal = (item: MediaItem) => {
    setEditingItem(item);
    setShowUploadModal(true);
  };

  const closeModal = () => {
    setShowUploadModal(false);
    setEditingItem(null);
  };

  const handleDelete = async (item: MediaItem) => {
    const confirmed = window.confirm(`Remove ${item.title} from your collection?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/media?folderName=${encodeURIComponent(item.folderName)}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Unable to remove media");
      }
      await loadMedia();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to remove media";
      setError(message);
    }
  };

  return (
    <div className="min-h-dvh">
      <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-8">
        <header className="mb-8 border-b border-border/60 pb-4 sm:mb-12 sm:pb-6">
          <div className="mb-6 flex flex-col items-center justify-between md:mb-8 md:flex-row">
            <div className="mb-4 w-full text-center md:mb-6 md:w-auto md:text-left">
              <h1 className="mb-2 text-3xl font-black tracking-tight text-white sm:mb-3 sm:text-4xl md:text-5xl">Home Cinema</h1>
              <p className="text-sm text-muted-foreground sm:text-base md:text-lg">
                Your collection has <span className="font-semibold text-white">{totalCount}</span> media
              </p>
            </div>

            <div className="mt-4 flex items-center gap-3 sm:gap-4 md:mt-0">
              <div className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-sm backdrop-blur-md sm:gap-2 sm:px-4 sm:py-2 sm:text-base">
                <Film className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                <span className="font-medium text-white">{movieCount}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-sm backdrop-blur-md sm:gap-2 sm:px-4 sm:py-2 sm:text-base">
                <Tv className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                <span className="font-medium text-white">{seriesCount}</span>
              </div>
              <Button onClick={openCreateModal} className="flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-white transition hover:-translate-y-0.5 hover:shadow-lg">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Upload</span>
              </Button>
            </div>
          </div>

          <div className="hidden items-center justify-between gap-4 md:flex md:flex-row">
            <div className="flex gap-3">
              <button
                onClick={() => setFilter("all")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 sm:px-5 sm:py-2.5 sm:text-base ${
                  filter === "all"
                    ? "bg-primary text-white hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                    : "border border-primary/60 bg-secondary/40 text-muted-foreground backdrop-blur-sm hover:border-primary/80 hover:bg-primary hover:text-white hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                }`}
              >
                All Media
              </button>
              <button
                onClick={() => setFilter("movies")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 sm:px-5 sm:py-2.5 sm:text-base ${
                  filter === "movies"
                    ? "bg-primary text-white hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                    : "border border-primary/60 bg-secondary/40 text-muted-foreground backdrop-blur-sm hover:border-primary/80 hover:bg-primary hover:text-white hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                }`}
              >
                <Film className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Movies</span>
                <span className="sm:hidden">Mov</span>
              </button>
              <button
                onClick={() => setFilter("series")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 sm:px-5 sm:py-2.5 sm:text-base ${
                  filter === "series"
                    ? "bg-primary text-white hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                    : "border border-primary/60 bg-secondary/40 text-muted-foreground backdrop-blur-sm hover:border-primary/80 hover:bg-primary hover:text-white hover:shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                }`}
              >
                <Tv className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Series</span>
                <span className="sm:hidden">Ser</span>
              </button>
            </div>

            <div className="min-w-[180px] w-full md:w-auto">
              <Select value={sort} onValueChange={(value: "a-z" | "z-a" | "newest" | "oldest") => setSort(value)}>
                <SelectTrigger className="border border-border bg-secondary/60 text-white backdrop-blur-md transition-colors hover:bg-secondary/70 sm:text-base">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="border border-border bg-card/90 backdrop-blur-md">
                  <SelectItem value="a-z" className="cursor-pointer text-sm focus:bg-accent focus:text-accent-foreground sm:text-base">A-Z</SelectItem>
                  <SelectItem value="z-a" className="cursor-pointer text-sm focus:bg-accent focus:text-accent-foreground sm:text-base">Z-A</SelectItem>
                  <SelectItem value="newest" className="cursor-pointer text-sm focus:bg-accent focus:text-accent-foreground sm:text-base">Newest</SelectItem>
                  <SelectItem value="oldest" className="cursor-pointer text-sm focus:bg-accent focus:text-accent-foreground sm:text-base">Oldest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="md:hidden">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="mr-3 flex-1">
                  <Select value={sort} onValueChange={(value: "a-z" | "z-a" | "newest" | "oldest") => setSort(value)}>
                    <SelectTrigger className="w-full border border-border bg-secondary/60 text-white backdrop-blur-md transition-colors hover:bg-secondary/70">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent className="border border-border bg-card/90 backdrop-blur-md">
                      <SelectItem value="a-z" className="cursor-pointer text-sm">A-Z</SelectItem>
                      <SelectItem value="z-a" className="cursor-pointer text-sm">Z-A</SelectItem>
                      <SelectItem value="newest" className="cursor-pointer text-sm">Newest</SelectItem>
                      <SelectItem value="oldest" className="cursor-pointer text-sm">Oldest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={() => setShowMobileFilters(!showMobileFilters)} variant="outline" size="sm" className="border-border bg-secondary/60">
                  {showMobileFilters ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                  <span className="ml-2 hidden xs:inline">{showMobileFilters ? "Close" : "Filters"}</span>
                </Button>
              </div>

              {showMobileFilters && (
                <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card/50 p-3 backdrop-blur-sm">
                  <button onClick={() => setFilter("all")} className={`flex min-w-[100px] flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${filter === "all" ? "bg-primary text-white" : "border border-primary/60 bg-secondary/40 text-muted-foreground"}`}>
                    All Media
                  </button>
                  <button onClick={() => setFilter("movies")} className={`flex min-w-[100px] flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${filter === "movies" ? "bg-primary text-white" : "border border-primary/60 bg-secondary/40 text-muted-foreground"}`}>
                    <Film className="h-3.5 w-3.5" />
                    Movies
                  </button>
                  <button onClick={() => setFilter("series")} className={`flex min-w-[100px] flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${filter === "series" ? "bg-primary text-white" : "border border-primary/60 bg-secondary/40 text-muted-foreground"}`}>
                    <Tv className="h-3.5 w-3.5" />
                    Series
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main>
          {loading ? (
            <div className="py-12 text-center text-white sm:py-20">Loading media...</div>
          ) : error ? (
            <div className="py-12 text-center text-red-300 sm:py-20">{error}</div>
          ) : (
            <MovieCatalog mediaItems={sortedItems} onEdit={openEditModal} onDelete={handleDelete} />
          )}
        </main>
      </div>

      <UploadModal open={showUploadModal} onClose={closeModal} itemToEdit={editingItem} onSaved={() => void loadMedia()} />
    </div>
  );
}
