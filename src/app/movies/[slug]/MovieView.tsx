import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import VideoPlayer from "@/app/components/VideoPlayer";
import MovieControls from "@/app/components/MovieControls";
import { Film, Users } from "lucide-react";

export default function MovieView({ media }: { media: any }) {
  return (
    <>
      <div className="mb-8">
        <VideoPlayer
          src={media.video}
          title={media.title}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <aside className="md:col-span-1">
          <div className="sticky top-8">
            <Card className="overflow-hidden">
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
                    🎬
                  </div>
                )}
              </div>
            </Card>

            <div className="mt-6 space-y-4">
              <div className="flex gap-2 flex-wrap">
                {media.genre?.map((g: string, i: number) => (
                  <Badge key={i} variant="secondary">
                    {g}
                  </Badge>
                ))}
              </div>

              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex justify-between">
                  <span className="flex items-center gap-2">
                    <Film className="h-4 w-4" />
                    Type
                  </span>
                  <span className="text-foreground font-semibold">Movie</span>
                </li>
                <li className="flex justify-between">
                  <span>Year</span>
                  <span className="text-foreground">
                    {media.year || "Unknown"}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Duration</span>
                  <span className="text-foreground">
                    {media.duration || "Unknown"}
                  </span>
                </li>
                {media.rating && (
                  <li className="flex justify-between">
                    <span>Rating</span>
                    <span className="flex items-center gap-1 text-foreground">
                      ⭐ {media.rating}/10
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
              {media.title}
            </h1>
            {media.director && (
              <p className="text-xl text-muted-foreground mb-6">
                Directed by{" "}
                <span className="text-foreground">{media.director}</span>
              </p>
            )}

            {media.description && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Synopsis</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {media.description}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {media.actors && media.actors.length > 0 && (
            <div>
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

          <MovieControls movie={media} />
        </article>
      </div>
    </>
  );
}