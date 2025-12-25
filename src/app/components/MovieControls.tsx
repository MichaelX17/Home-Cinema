"use client";

import { FC } from "react";

interface MovieControlsProps {
  movie: {
    title: string;
    video: string;
  };
}

const MovieControls: FC<MovieControlsProps> = ({ movie }) => {
  return (
    <div className="border-t border-white/10 pt-8">
      <h2 className="text-2xl font-semibold mb-4">Controles</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <button
          onClick={() => {
            localStorage.removeItem(`progress_${movie.title}`);
            window.location.reload();
          }}
          className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
        >
          Reiniciar progreso
        </button>
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              window.open(movie.video, "_blank");
            }
          }}
          className="px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
        >
          Abrir video en nueva pestaña
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
          }}
          className="px-4 py-3 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors"
        >
          Copiar enlace
        </button>
      </div>
    </div>
  );
};

export default MovieControls;
