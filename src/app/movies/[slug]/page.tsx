import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import VideoPlayer from "@/app/components/VideoPlayer";
import MovieControls from "@/app/components/MovieControls";

// Generar rutas estáticas para todas las películas
export async function generateStaticParams() {
  const moviesDir = path.join(process.cwd(), "public/movies");

  if (!fs.existsSync(moviesDir)) {
    return [];
  }

  const movieFolders = fs.readdirSync(moviesDir);

  return movieFolders
    .filter((folder) => {
      const folderPath = path.join(moviesDir, folder);
      return fs.statSync(folderPath).isDirectory();
    })
    .map((folder) => ({
      slug: folder,
    }));
}

// Obtener datos de una película específica
function getMovie(slug: string) {
  try {
    const movieDir = path.join(process.cwd(), "public/movies", slug);

    if (!fs.existsSync(movieDir)) {
      return null;
    }

    const files = fs.readdirSync(movieDir);

    // Buscar archivos
    const coverFile = files.find(
      (f) =>
        f.toLowerCase().includes("cover") ||
        f.toLowerCase().includes("poster") ||
        /\.(jpg|jpeg|png|webp)$/i.test(f)
    );

    const videoFile = files.find(
      (f) =>
        f.toLowerCase().includes("movie") ||
        f.toLowerCase().includes("video") ||
        /\.(mp4|mkv|avi|mov|webm)$/i.test(f)
    );

    // Leer metadata
    let metadata: any = {};
    const jsonFile = files.find((f) => f.endsWith(".json"));
    if (jsonFile) {
      try {
        const jsonPath = path.join(movieDir, jsonFile);
        metadata = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      } catch (error) {
        console.error(`Error leyendo JSON de ${slug}:`, error);
      }
    }

    return {
      slug,
      title: metadata.title || slug.replace(/-/g, " "),
      year: metadata.year,
      duration: metadata.duration,
      description: metadata.description,
      genre: metadata.genre || [],
      director: metadata.director,
      actors: metadata.actors || [],
      rating: metadata.rating,
      cover: coverFile ? `/movies/${slug}/${coverFile}` : "",
      video: videoFile ? `/movies/${slug}/${videoFile}` : "",
    };
  } catch (error) {
    console.error(`Error obteniendo película ${slug}:`, error);
    return null;
  }
}

export default function MoviePage({ params }: { params: { slug: string } }) {
  const p = use(Promise.resolve(params));
  const movie = getMovie(p.slug);

  if (!movie || !movie.video) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <Button asChild variant="outline">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-lg">←</span>
            <span>Back to Catalog</span>
          </Link>
        </Button>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="mb-8">
          <VideoPlayer
            src={movie.video}
            poster={movie.cover}
            title={movie.title}
            autoPlay={true}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <aside className="md:col-span-1">
            <div className="sticky top-8">
              <Card className="overflow-hidden">
                <div className="relative aspect-[2/3]">
                  {movie.cover ? (
                    <Image
                      src={movie.cover}
                      alt={movie.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary flex items-center justify-center text-6xl text-muted-foreground">
                      🎬
                    </div>
                  )}
                </div>
              </Card>

              <div className="mt-6 space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {movie.genre?.map((g: string, i: number) => (
                    <Badge key={i} variant="secondary">
                      {g}
                    </Badge>
                  ))}
                </div>

                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex justify-between">
                    <span>Year</span>
                    <span className="text-foreground">
                      {movie.year || "Unknown"}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Duration</span>
                    <span className="text-foreground">
                      {movie.duration || "Unknown"}
                    </span>
                  </li>
                  {movie.rating && (
                    <li className="flex justify-between">
                      <span>Rating</span>
                      <span className="flex items-center gap-1 text-foreground">
                        ⭐ {movie.rating}/10
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </aside>

          <article className="md:col-span-2 space-y-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">
                {movie.title}
              </h1>
              {movie.director && (
                <p className="text-xl text-muted-foreground mb-6">
                  Directed by{" "}
                  <span className="text-foreground">{movie.director}</span>
                </p>
              )}

              {movie.description && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-semibold mb-4">Synopsis</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {movie.description}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {movie.actors && movie.actors.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">Cast</h2>
                <div className="flex flex-wrap gap-3">
                  {movie.actors.map((actor: string, i: number) => (
                    <Badge key={i} variant="outline">
                      {actor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <MovieControls movie={movie} />
          </article>
        </div>
      </main>
    </div>
  );
}