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

    return () => {
      clearInterval(interval);
    };
  }, [title]);

  return (
    <div className="w-full">
      <AspectRatio ratio={16 / 9} className="bg-black rounded-lg overflow-hidden shadow-2xl">
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
          Your browser does not support HTML5 video.
        </video>
      </AspectRatio>
    </div>
  );
}