import fs from "fs";
import path from "path";
import MovieCard from "./components/MovieCard";

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
      .filter(folder => {
        const folderPath = path.join(moviesDir, folder);
        return fs.statSync(folderPath).isDirectory();
      })
      .map(folder => {
        const folderPath = path.join(moviesDir, folder);
        const files = fs.readdirSync(folderPath);
        
        // Buscar archivos automáticamente
        const coverFile = files.find(f => 
          f.toLowerCase().includes("cover") || 
          f.toLowerCase().includes("poster") ||
          /\.(jpg|jpeg|png|webp)$/i.test(f)
        );
        
        const videoFile = files.find(f => 
          f.toLowerCase().includes("movie") ||
          f.toLowerCase().includes("video") ||
          /\.(mp4|mkv|avi|mov|webm)$/i.test(f)
        );
        
        // Leer metadata
        let metadata = {};
        const jsonFile = files.find(f => f.endsWith(".json"));
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
      .filter(movie => movie.video); // Solo películas con video
  } catch (error) {
    console.error("Error leyendo películas:", error);
    return [];
  }
}

export default function Home() {
  const movies = getMovies();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-blue-900/20" />
        
        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              🎬 Mi Home Cinema
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Tu colección personal de películas. {movies.length} títulos disponibles.
            </p>
          </div>
          
          {/* Barra de búsqueda */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar película..."
                className="w-full px-6 py-4 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                🔍
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Catálogo de películas */}
      <div className="container mx-auto px-4 pb-20">
        {movies.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎥</div>
            <h2 className="text-2xl font-semibold mb-2">No hay películas aún</h2>
            <p className="text-gray-400 mb-6">
              Agrega películas en la carpeta <code className="bg-gray-800 px-2 py-1 rounded">public/movies/</code>
            </p>
            <div className="max-w-md mx-auto text-left bg-gray-900/50 p-6 rounded-xl">
              <h3 className="font-semibold mb-2">Estructura de ejemplo:</h3>
              <pre className="text-sm text-gray-300">
{`movies/
├── el-padrino/
│   ├── cover.jpg
│   ├── info.json
│   └── video.mp4
└── interstellar/
    ├── poster.webp
    └── movie.mp4`}
              </pre>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Catálogo</h2>
              <div className="text-gray-400">
                Ordenar por: <select className="bg-transparent border-none focus:outline-none">
                  <option>Fecha agregada</option>
                  <option>A-Z</option>
                  <option>Año</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
            
            <div className="mt-12 text-center text-gray-400">
              <p>Para agregar más películas, simplemente crea una nueva carpeta en <code>public/movies/</code></p>
            </div>
          </>
        )}
      </div>
      
      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>Home Cinema Personal • Solo para uso doméstico • {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}