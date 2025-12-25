import fs from "fs";
import path from "path";
import MovieCard from "./components/MovieCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

// Interfaz para la película
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

// Función para leer las películas
function getMovies(): Movie[] {
  try {
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
      .map((folder) => {
        const folderPath = path.join(moviesDir, folder);
        const files = fs.readdirSync(folderPath);

        // Buscar archivos automáticamente
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
        let metadata = {};
        const jsonFile = files.find((f) => f.endsWith(".json"));
        if (jsonFile) {
          try {
            const jsonPath = path.join(folderPath, jsonFile);
            metadata = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
          } catch (error) {
            console.error(`Error leyendo JSON de ${folder}:`, error);
          }
        }

        return {
          id: folder,
          folderName: folder,
          title: (metadata as any).title || folder.replace(/-/g, " "),
          year: (metadata as any).year,
          duration: (metadata as any).duration,
          description: (metadata as any).description,
          cover: coverFile ? `/movies/${folder}/${coverFile}` : "",
          video: videoFile ? `/movies/${folder}/${videoFile}` : "",
        };
      })
      .filter((movie) => movie.video); // Solo películas con video
  } catch (error) {
    console.error("Error leyendo películas:", error);
    return [];
  }
}

export default function Home() {
  const movies = getMovies();

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div className="text-center md:text-left mb-4 md:mb-0">
          <h1 className="text-4xl font-bold">Home Cinema</h1>
          <p className="text-muted-foreground">
            Your personal movie collection. {movies.length} titles available.
          </p>
        </div>
        <div className="w-full md:w-1/3">
          <Input type="search" placeholder="Search movies..." />
        </div>
      </header>

      <main>
        {movies.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎥</div>
            <h2 className="text-2xl font-semibold mb-2">No movies yet</h2>
            <p className="text-muted-foreground mb-6">
              Add movies to the{" "}
              <code className="bg-muted px-2 py-1 rounded">
                public/movies/
              </code>{" "}
              folder.
            </p>
            <Card className="max-w-md mx-auto text-left p-6">
              <h3 className="font-semibold mb-2">Example structure:</h3>
              <pre className="text-sm text-muted-foreground">
                {`movies/
├── the-godfather/
│   ├── cover.jpg
│   ├── info.json
│   └── video.mp4
└── interstellar/
    ├── poster.webp
    └── movie.mp4`}
              </pre>
            </Card>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">Catalog</h2>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Sort by:</span>
                <Select>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Date Added" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date Added</SelectItem>
                    <SelectItem value="az">A-Z</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t mt-12 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>
            Personal Home Cinema • For domestic use only •{" "}
            {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}