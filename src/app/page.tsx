import fs from "fs";
import path from "path";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Film, Tv } from "lucide-react";
import MovieCatalog from "./components/MovieCatalog";

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

function getMediaItems(): MediaItem[] {
  try {
    const mediaDir = path.join(process.cwd(), "public/movies");
    if (!fs.existsSync(mediaDir)) return [];

    return fs
      .readdirSync(mediaDir)
      .filter((folder) =>
        fs.statSync(path.join(mediaDir, folder)).isDirectory()
      )
      .map((folder) => {
        const folderPath = path.join(mediaDir, folder);
        const files = fs.readdirSync(folderPath);

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

        let metadata: any = {};
        const jsonFile = files.find((f) => f.endsWith(".json"));
        if (jsonFile) {
          try {
            metadata = JSON.parse(
              fs.readFileSync(path.join(folderPath, jsonFile), "utf-8")
            );
          } catch { }
        }

        // Determinar el tipo (movie o series) y normalizar "serie" a "series"
        const rawType = metadata.type || "movie";
        const type = rawType === "serie" ? "series" : rawType;

        return {
          id: folder,
          folderName: folder,
          title: metadata.title || folder.replace(/-/g, " "),
          year: metadata.year,
          duration: metadata.duration,
          description: metadata.description,
          cover: coverFile ? `/movies/${folder}/${coverFile}` : "",
          video: type === "movie" ? (videoFile ? `/movies/${folder}/${videoFile}` : "") : "",
          type: type, // Usa el tipo normalizado
        };
      })
      .filter((item) => {
        // Para películas, debe tener video. Para series, no es necesario
        if (item.type === "movie") {
          return item.video;
        }
        return true; // Series no requieren video en la raíz
      });
  } catch {
    return [];
  }
}

export default function Home() {
  const mediaItems = getMediaItems();
  const movieCount = mediaItems.filter(item => item.type === "movie").length;
  const seriesCount = mediaItems.filter(item => item.type === "series").length;

  // Añade un console.log para depurar
  console.log("Total media items:", mediaItems.length);
  console.log("Movies:", movieCount);
  console.log("Series:", seriesCount);
  console.log("Media items:", mediaItems.map(item => ({
    title: item.title,
    type: item.type,
    cover: item.cover ? "yes" : "no",
    video: item.video ? "yes" : "no"
  })));

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-12 pb-6 border-b border-border">
        <div className="text-center md:text-left mb-4 md:mb-0">
          <h1 className="text-5xl font-extrabold tracking-tighter text-primary">
            Home Cinema
          </h1>
          <p className="text-muted-foreground mt-2">
            Your personal media collection. {movieCount} movies, {seriesCount} series available.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-full">
            <Film className="h-4 w-4" />
            <span className="text-sm">{movieCount}</span>
          </div>
          <div className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-full">
            <Tv className="h-4 w-4" />
            <span className="text-sm">{seriesCount}</span>
          </div>

          <div className="w-full md:max-w-xs relative">
            <Input
              type="search"
              placeholder="Search media..."
              className="pr-10"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Film className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </header>

      <main>
        {mediaItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto w-fit p-4 bg-secondary rounded-full mb-6">
              <Film className="h-16 w-16 text-primary" />
            </div>

            <h2 className="text-3xl font-bold mb-2">No media found</h2>

            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              To get started, add some movies or series to the{" "}
              <code className="bg-muted px-2 py-1 rounded-md font-mono text-sm">
                public/movies/
              </code>{" "}
              directory on your server.
            </p>

            <Card className="max-w-lg mx-auto text-left bg-card border-border">
              <CardHeader>
                <h3 className="font-semibold text-lg text-primary">
                  Example File Structure
                </h3>
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-muted-foreground bg-muted p-4 rounded-md overflow-x-auto">
                  <code>
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
          <MovieCatalog mediaItems={mediaItems} />
        )}
      </main>

      <footer className="border-t border-border mt-16 pt-8">
        <div className="text-center text-muted-foreground text-sm">
          <p>
            <span className="font-bold text-primary">Home Cinema</span> • For
            Personal Use Only • {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}