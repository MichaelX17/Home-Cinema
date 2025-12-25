import MovieControls from "@/app/components/MovieControls";
import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import Link from "next/link";
import VideoPlayer from "@/app/components/VideoPlayer";
import Image from "next/image";
import { use } from 'react';

// Generar rutas estáticas para todas las películas
export async function generateStaticParams() {
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
    let metadata: any = {};
    const jsonFile = files.find(f => f.endsWith(".json"));
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

interface MoviePageProps {
  params: {
    slug: string;
  };
}


export default function MoviePage({ params }: { params: { slug: string } }) {
  const p = use(Promise.resolve(params));
  const movie = getMovie(p.slug);
  
  if (!movie || !movie.video) {
    notFound();
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      {/* Header */}
      <div className="container mx-auto px-4 py-6">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors mb-8"
        >
          <span className="text-xl">←</span>
          <span>Volver al catálogo</span>
        </Link>
      </div>
      
      {/* Contenido principal */}
      <div className="container mx-auto px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          {/* Video player */}
          <div className="mb-12">
            <VideoPlayer 
              src={movie.video}
              poster={movie.cover}
              title={movie.title}
              autoPlay={true}
            />
          </div>
          
          {/* Información de la película */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Portada y detalles básicos */}
            <div className="md:col-span-1">
              <div className="sticky top-6">
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-6">
                  {movie.cover ? (
                    <Image
                      src={movie.cover}
                      alt={movie.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center text-6xl">
                      🎬
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    {movie.genre?.map((g: string, i: number) => (
                      <span 
                        key={i}
                        className="px-3 py-1 bg-white/10 rounded-full text-sm"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Año</span>
                      <span>{movie.year || "Desconocido"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Duración</span>
                      <span>{movie.duration || "Desconocida"}</span>
                    </div>
                    {movie.rating && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Rating</span>
                        <span className="flex items-center gap-1">
                          ⭐ {movie.rating}/10
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Sinopsis y detalles */}
            <div className="md:col-span-2 space-y-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">{movie.title}</h1>
                
                {movie.director && (
                  <p className="text-xl text-gray-300 mb-6">
                    Dirigida por <span className="text-white">{movie.director}</span>
                  </p>
                )}
                
                {movie.description && (
                  <div className="bg-white/5 backdrop-blur-sm p-6 rounded-2xl mb-8">
                    <h2 className="text-2xl font-semibold mb-4">Sinopsis</h2>
                    <p className="text-gray-300 leading-relaxed text-lg">
                      {movie.description}
                    </p>
                  </div>
                )}
              </div>
              
              {movie.actors && movie.actors.length > 0 && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Reparto</h2>
                  <div className="flex flex-wrap gap-2">
                    {movie.actors.map((actor: string, i: number) => (
                      <span 
                        key={i}
                        className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                      >
                        {actor}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              
              {/* Controles adicionales */}
              <MovieControls movie={movie} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}