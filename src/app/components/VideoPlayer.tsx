"use client";

import { useRef, useEffect } from "react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title: string;
  autoPlay?: boolean;
}

export default function VideoPlayer({ src, poster, title, autoPlay = true }: VideoPlayerProps) {
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
      if (video && video.currentTime) {
        localStorage.setItem(`progress_${title}`, video.currentTime.toString());
      }
    };
    
    if (video) {
      video.addEventListener("timeupdate", saveProgress);
      return () => video.removeEventListener("timeupdate", saveProgress);
    }
  }, [title]);
  
  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };
  
  return (
    <div className="relative w-full max-w-6xl mx-auto">
      <video
        ref={videoRef}
        controls
        autoPlay={autoPlay}
        className="w-full rounded-xl shadow-2xl"
        poster={poster}
        playsInline
      >
        <source src={src} type="video/mp4" />
        Tu navegador no soporta videos HTML5.
      </video>
      
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          onClick={handleFullscreen}
          className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-black/80 transition-colors"
          title="Pantalla completa (F)"
        >
          🖥️ Pantalla completa
        </button>
      </div>
    </div>
  );
}