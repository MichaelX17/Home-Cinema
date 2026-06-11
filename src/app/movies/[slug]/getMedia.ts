import fs from "fs";
import path from "path";

// Obtener datos de una media específica (película o serie)
export function getMedia(slug: string) {
  try {
    const mediaDir = path.join(process.cwd(), "../movies-files", slug);

    if (!fs.existsSync(mediaDir)) {
      return null;
    }

    const files = fs.readdirSync(mediaDir);

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

    const fallbackVideoFile = !videoFile
      ? files.find(
          (f) =>
            !f.toLowerCase().includes("cover") &&
            !f.toLowerCase().includes("poster") &&
            !/\.(jpg|jpeg|png|webp)$/i.test(f) &&
            !f.endsWith(".json")
        )
      : undefined;

    const effectiveVideoFile = videoFile || fallbackVideoFile;

    // Leer metadata
    let metadata: any = {};
    const jsonFile = files.find((f) => f.endsWith(".json"));
    if (jsonFile) {
      try {
        const jsonPath = path.join(mediaDir, jsonFile);
        metadata = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      } catch (error) {
        console.error(`Error leyendo JSON de ${slug}:`, error);
      }
    }

    // Determinar tipo (default: movie) y normalizar "serie" a "series"
    const rawType = metadata.type || "movie";
    const type = rawType === "serie" ? "series" : rawType;

    // Si es una película, retornar datos de película
    if (type === "movie") {
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
        cover: coverFile
          ? `/api/videos/${encodeURIComponent(`${slug}/${coverFile}`)}`
          : "",
        video: effectiveVideoFile
          ? `/api/videos/${encodeURIComponent(`${slug}/${effectiveVideoFile}`)}`
          : "",
        type: "movie",
      };
    }

    // Si es una serie, buscar temporadas y episodios
    if (type === "series") {
      // Buscar temporadas
      const seasons: any[] = [];
      const seasonFolders = files
        .filter((f) => {
          const folderPath = path.join(mediaDir, f);
          return (
            fs.statSync(folderPath).isDirectory() &&
            f.toLowerCase().includes("season")
          );
        })
        .sort((a, b) => {
          // Ordenar principalmente por nombre (alfabético), con fallback numérico
          const nameA = a.toLowerCase();
          const nameB = b.toLowerCase();
          const cmp = nameA.localeCompare(nameB);
          if (cmp !== 0) return cmp;
          const numA = parseInt(a.replace(/\D/g, "")) || 0;
          const numB = parseInt(b.replace(/\D/g, "")) || 0;
          return numA - numB;
        });

      // Para cada temporada, buscar episodios
      seasonFolders.forEach((seasonFolder, index) => {
        const seasonPath = path.join(mediaDir, seasonFolder);
        const seasonFiles = fs.readdirSync(seasonPath);

        const episodes: any[] = seasonFiles
          .filter((f) => /\.(mp4|mkv|avi|mov|webm)$/i.test(f))
          .sort((a, b) => {
            // Ordenar principalmente por nombre (alfabético), con fallback numérico
            const nameA = a.toLowerCase();
            const nameB = b.toLowerCase();
            const cmp = nameA.localeCompare(nameB);
            if (cmp !== 0) return cmp;
            const numA = parseInt(a.replace(/\D/g, "")) || 0;
            const numB = parseInt(b.replace(/\D/g, "")) || 0;
            return numA - numB;
          })
          .map((file, epIndex) => ({
            number: epIndex + 1,
            title: `Episode ${epIndex + 1}`,
            file: `/api/videos/${encodeURIComponent(`${slug}/${seasonFolder}/${file}`)}`,
            seasonNumber: index + 1,
          }));

        seasons.push({
          number: index + 1,
          episodes,
        });
      });

      return {
        slug,
        title: metadata.title || slug.replace(/-/g, " "),
        year: metadata.year,
        description: metadata.description,
        genre: metadata.genre || [],
        director: metadata.director,
        actors: metadata.actors || [],
        rating: metadata.rating,
        cover: coverFile
          ? `/api/videos/${encodeURIComponent(`${slug}/${coverFile}`)}`
          : "",
        type: "series",
        seasons,
        totalSeasons: seasons.length,
        totalEpisodes: seasons.reduce((total, season) => total + season.episodes.length, 0),
      };
    }

    return null;
  } catch (error) {
    console.error(`Error obteniendo media ${slug}:`, error);
    return null;
  }
}

// Generar rutas estáticas para todas las películas y series
export async function generateStaticParams() {
  const moviesDir = path.join(process.cwd(), "../movies-files");

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