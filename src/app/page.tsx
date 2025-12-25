import fs from "fs";
import path from "path";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Film } from "lucide-react";
import MovieCatalog from "./components/MovieCatalog";

interface Movie {
  id: string;
  title: string;
  year?: string;
  duration?: string;
  description?: string;
  cover: string;
  video: string;
  folderName: string;
}

function getMovies(): Movie[] {
  try {
    const moviesDir = path.join(process.cwd(), "public/movies");
    if (!fs.existsSync(moviesDir)) return [];

    return fs
      .readdirSync(moviesDir)
      .filter((folder) =>
        fs.statSync(path.join(moviesDir, folder)).isDirectory()
      )
      .map((folder) => {
        const folderPath = path.join(moviesDir, folder);
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
          } catch {}
        }

        return {
          id: folder,
          folderName: folder,
          title: metadata.title || folder.replace(/-/g, " "),
          year: metadata.year,
          duration: metadata.duration,
          description: metadata.description,
          cover: coverFile ? `/movies/${folder}/${coverFile}` : "",
          video: videoFile ? `/movies/${folder}/${videoFile}` : "",
        };
      })
      .filter((movie) => movie.video);
  } catch {
    return [];
  }
}

export default function Home() {
  const movies = getMovies();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-12 pb-6 border-b border-border">
        <div className="text-center md:text-left mb-4 md:mb-0">
          <h1 className="text-5xl font-extrabold tracking-tighter text-primary">
            Home Cinema
          </h1>
          <p className="text-muted-foreground mt-2">
            Your personal movie collection. {movies.length} titles available.
          </p>
        </div>

        <div className="w-full md:max-w-xs relative">
          <Input
            type="search"
            placeholder="Search movies..."
            className="pr-10"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Film className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </header>

      <main>
        {movies.length === 0 ? (
          <div className="text-center py-20">
            <div className="mx-auto w-fit p-4 bg-secondary rounded-full mb-6">
              <Film className="h-16 w-16 text-primary" />
            </div>

            <h2 className="text-3xl font-bold mb-2">No movies found</h2>

            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              To get started, add some movies to the{" "}
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
├── the-godfather/
│   ├── cover.jpg
│   ├── info.json
│   └── video.mp4
└── interstellar/
    ├── poster.webp
    └── movie.mp4`}
                  </code>
                </pre>
              </CardContent>
            </Card>
          </div>
        ) : (
          <MovieCatalog movies={movies} />
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
