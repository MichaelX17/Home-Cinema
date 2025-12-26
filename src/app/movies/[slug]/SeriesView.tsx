"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import VideoPlayer from "@/app/components/VideoPlayer";
import { Play, Tv, Calendar, Users, X } from "lucide-react";

export default function SeriesView({ media }: { media: any }) {
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handlePlayEpisode = (episode: any) => {
    setSelectedEpisode(episode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseEpisode = () => {
    setSelectedEpisode(null);
  };

  return (
    <>
      {/* Video Player para el episodio seleccionado */}
      {selectedEpisode && isClient && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              Now Playing: {selectedEpisode.title} - Season {selectedEpisode.seasonNumber}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseEpisode}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Close
            </Button>
          </div>
          <VideoPlayer
            src={selectedEpisode.file}
            title={`${media.title} - ${selectedEpisode.title}`}
          />
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <aside className="md:col-span-1">
          <div className="sticky top-8">
            <Card className="overflow-hidden mb-6">
              <div className="relative aspect-[2/3]">
                {media.cover ? (
                  <Image
                    src={media.cover}
                    alt={media.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center text-6xl text-muted-foreground">
                    📺
                  </div>
                )}
              </div>
            </Card>

            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {media.genre?.map((g: string, i: number) => (
                  <Badge key={i} variant="secondary">
                    {g}
                  </Badge>
                ))}
              </div>

              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Tv className="h-4 w-4" />
                    Type
                  </span>
                  <span className="text-foreground font-semibold">Series</span>
                </li>
                <li className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Year
                  </span>
                  <span className="text-foreground">{media.year || "Unknown"}</span>
                </li>
                <li className="flex justify-between">
                  <span>Seasons</span>
                  <span className="text-foreground">{media.totalSeasons}</span>
                </li>
                <li className="flex justify-between">
                  <span>Episodes</span>
                  <span className="text-foreground">{media.totalEpisodes}</span>
                </li>
                {media.rating && (
                  <li className="flex justify-between">
                    <span>Rating</span>
                    <span className="flex items-center gap-1 text-foreground">
                      ⭐ {media.rating}/10
                    </span>
                  </li>
                )}
                {media.director && (
                  <li className="flex justify-between">
                    <span>Director</span>
                    <span className="text-foreground">{media.director}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </aside>

        <article className="md:col-span-2">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {media.title}
            </h1>

            {media.description && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Synopsis</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {media.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {media.actors && media.actors.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Cast
                </h2>
                <div className="flex flex-wrap gap-3">
                  {media.actors.map((actor: string, i: number) => (
                    <Badge key={i} variant="outline">
                      {actor}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Temporadas y episodios */}
          <div>
            <h2 className="text-3xl font-bold mb-6">Seasons & Episodes</h2>
            <div className="space-y-8">
              {media.seasons.map((season: any) => (
                <Card key={season.number}>
                  <CardContent className="p-6">
                    <h3 className="text-2xl font-semibold mb-4">
                      Season {season.number}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {season.episodes.map((episode: any) => (
                        <Card
                          key={episode.number}
                          className="overflow-hidden hover:border-primary transition-colors cursor-pointer group"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <span className="font-semibold block">
                                  {episode.title}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  Season {episode.seasonNumber} • Episode {episode.number}
                                </span>
                              </div>
                              <Badge variant="outline">
                                EP {episode.number}
                              </Badge>
                            </div>
                            
                            {/* Botón para reproducir episodio */}
                            <Button
                              onClick={() => handlePlayEpisode(episode)}
                              variant="default"
                              className="w-full"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Play Episode
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </article>
      </div>
    </>
  );
}