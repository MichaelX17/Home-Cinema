"use client";

import { useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title: string;
}

export default function VideoPlayer({ src, poster, title }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isDesktop, setIsDesktop] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  /* ===== Plataforma ===== */
  useEffect(() => {
    const check = () =>
      setIsDesktop(window.matchMedia("(min-width: 768px)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ===== Persistencia ===== */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const t = localStorage.getItem(`progress_${title}`);
    const vol = localStorage.getItem(`volume_${title}`);

    if (t) v.currentTime = Number(t);
    if (vol) {
      v.volume = Number(vol);
      setVolume(Number(vol));
    }
  }, [title]);

  /* ===== Eventos ===== */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTime = () => {
      setCurrentTime(v.currentTime);
      localStorage.setItem(`progress_${title}`, v.currentTime.toString());
    };

    const onLoaded = () => setDuration(v.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);

    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [title]);

  /* ===== Acciones ===== */
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    isPlaying ? v.pause() : v.play();
  };

  const skip = (s: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += s;
    }
  };

  const fullscreen = () => {
    const v = videoRef.current as any;
    if (!v) return;

    // iOS Safari
    if (v.webkitEnterFullscreen) {
      v.webkitEnterFullscreen();
      return;
    }

    // Android / Desktop
    if (v.requestFullscreen) {
      v.requestFullscreen();
    }
  };

  return (
    <div className="relative w-full bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="metadata"
        playsInline
        controls={!isDesktop}
        className="w-full bg-black"
      />

      {/* Overlay Play (solo desktop) */}
      {isDesktop && !isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-4xl"
        >
          ▶
        </button>
      )}

      {/* Controles custom SOLO desktop */}
      {isDesktop && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
          <input
            type="range"
            min={0}
            max={duration}
            value={currentTime}
            onChange={(e) =>
              (videoRef.current!.currentTime = Number(e.target.value))
            }
            className="w-full"
          />

          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-2">
              <button onClick={togglePlay}>⏯</button>
              <button onClick={() => skip(-5)}>⏪5s</button>
              <button onClick={() => skip(5)}>5s⏩</button>
            </div>

            <div className="flex gap-2 items-center">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setVolume(v);
                  videoRef.current!.volume = v;
                  localStorage.setItem(`volume_${title}`, v.toString());
                }}
              />
              <button onClick={fullscreen}>⛶</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
