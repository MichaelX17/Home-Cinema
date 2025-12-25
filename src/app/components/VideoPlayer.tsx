"use client";

import { useRef, useEffect } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title: string;
  autoPlay?: boolean;
}

export default function VideoPlayer({
  src,
  poster,
  title,
  autoPlay = true,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Cargar progreso guardado
    const savedTime = localStorage.getItem(`progress_${title}`);
    if (videoRef.current && savedTime) {
      videoRef.current.currentTime = parseFloat(savedTime);
    }

    // Guardar progreso cada 5 segundos
    const video = videoRef.current;
    const saveProgress = () => {
      if (video && video.currentTime > 0) {
        localStorage.setItem(`progress_${title}`, video.currentTime.toString());
      }
    };

    const interval = setInterval(saveProgress, 5000);

    // Limpiar intervalo y guardar progreso al desmontar
    return () => {
      clearInterval(interval);
      if (video) {
        saveProgress();
      }
    };
  }, [title]);

  return (
    <div className="w-full relative">
      <AspectRatio
        ratio={16 / 9}
        className="bg-black rounded-lg overflow-hidden border border-border shadow-2xl shadow-red-500/10"
      >
        <video
          ref={videoRef}
          controls
          autoPlay={autoPlay}
          className="w-full h-full"
          poster={poster}
          playsInline
          key={src} // Forzar recarga del video si la fuente cambia
        >
          <source src={src} type="video/mp4" />
          Tu navegador no soporta video HTML5.
        </video>
        <div className="absolute inset-0 pointer-events-none rounded-lg ring-1 ring-inset ring-white/10" />
      </AspectRatio>
    </div>
  );
}