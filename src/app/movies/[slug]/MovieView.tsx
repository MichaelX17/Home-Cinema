import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import VideoPlayer from "@/app/components/VideoPlayer";
import MovieControls from "@/app/components/MovieControls";
import { Film, Users, Calendar, Clock, Star } from "lucide-react";

export default function MovieView({ media }: { media: any }) {
  return (
    <>
      <div className="mb-8">
        <VideoPlayer
          src={media.video}
          poster={media.cover}
          title={media.title}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Sidebar izquierda */}
        <aside className="md:col-span-1">
          <div className="sticky top-8 space-y-6">
            {/* Portada */}
            <Card className="overflow-hidden bg-card/60 backdrop-blur-md border border-border group">
              <div className="relative aspect-[2/3]">
                {media.cover ? (
                  <Image
                    src={media.cover}
                    alt={media.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center text-6xl text-muted-foreground">
                    🎬
                  </div>
                )}
              </div>
            </Card>

            {/* Información de la película */}
            <div className="space-y-6">
              {/* Géneros */}
              {media.genre && media.genre.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Genres
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {media.genre.map((g: string, i: number) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className="bg-primary/20 hover:bg-primary/30 text-primary-foreground border border-primary/30"
                      >
                        {g}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadatos */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Details
                </h3>
                <Card className="bg-card/60 backdrop-blur-md border border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Film className="h-4 w-4" />
                        <span className="text-sm">Type</span>
                      </div>
                      <span className="text-foreground font-semibold">Movie</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">Year</span>
                      </div>
                      <span className="text-foreground font-semibold">
                        {media.year || "Unknown"}
                      </span>
                    </div>

                    {media.duration && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">Duration</span>
                        </div>
                        <span className="text-foreground font-semibold">
                          {media.duration}
                        </span>
                      </div>
                    )}

                    {media.rating && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Star className="h-4 w-4" />
                          <span className="text-sm">Rating</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-foreground font-semibold">
                            {media.rating}/10
                          </span>
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </aside>

        {/* Contenido principal */}
        <article className="md:col-span-2 space-y-8">
          {/* Título y director */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                {media.title}
              </h1>
              {media.director && (
                <p className="text-xl text-muted-foreground">
                  Directed by{" "}
                  <span className="text-primary font-semibold">{media.director}</span>
                </p>
              )}
            </div>

            {/* Sinopsis */}
            {media.description && (
              <Card className="bg-card/60 backdrop-blur-md border border-border transition-all duration-300 hover:border-primary/30">
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-2xl font-semibold text-primary flex items-center gap-2">
                    <span className="h-1 w-8 bg-primary rounded-full"></span>
                    Synopsis
                  </h2>
                  <p className="text-muted-foreground leading-relaxed text-lg">
                    {media.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Reparto */}
            {media.actors && media.actors.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-primary flex items-center gap-3">
                  <Users className="h-6 w-6" />
                  Cast
                </h2>
                <div className="flex flex-wrap gap-3">
                  {media.actors.map((actor: string, i: number) => (
                    <Badge 
                      key={i} 
                      variant="outline" 
                      className="bg-card/60 backdrop-blur-md border-border text-foreground hover:border-primary hover:bg-primary/10 hover:text-primary transition-all duration-300"
                    >
                      {actor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Controles de la película */}
          <MovieControls movie={media} />
        </article>
      </div>
    </>
  );
}