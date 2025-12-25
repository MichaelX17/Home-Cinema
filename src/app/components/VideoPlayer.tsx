"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pointer } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title: string;
}

export default function VideoPlayer({ src, poster, title }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDesktop, setIsDesktop] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const progress = duration ? (currentTime / duration) * 100 : 0;

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
      const volNum = Number(vol);
      v.volume = volNum;
      setVolume(volNum);
    }
  }, [title]);

  /* ===== Eventos video ===== */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTime = () => {
      setCurrentTime(v.currentTime);
      localStorage.setItem(`progress_${title}`, v.currentTime.toString());
    };

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", () => setDuration(v.duration));
    v.addEventListener("play", () => setIsPlaying(true));
    v.addEventListener("pause", () => setIsPlaying(false));

    return () => {
      v.removeEventListener("timeupdate", onTime);
    };
  }, [title]);

  /* ===== Fullscreen ===== */
  useEffect(() => {
    const onChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      document.body.style.overflow = fs ? "hidden" : "";
    };

    document.addEventListener("fullscreenchange", onChange);
    return () =>
      document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /* ===== Teclado ===== */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isDesktop) return;
      if (!videoRef.current) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          skip(-5);
          break;
        case "ArrowRight":
          skip(5);
          break;
        case "KeyF":
          fullscreen();
          break;
        case "ArrowUp":
          changeVolume(0.05);
          break;
        case "ArrowDown":
          changeVolume(-0.05);
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDesktop, isPlaying, volume]);

  /* ===== Acciones ===== */
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    isPlaying ? v.pause() : v.play();
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const changeVolume = (delta: number) => {
    if (!videoRef.current) return;
    const newVol = Math.min(1, Math.max(0, volume + delta));
    setVolume(newVol);
    videoRef.current.volume = newVol;
    localStorage.setItem(`volume_${title}`, newVol.toString());
  };

  const fullscreen = () => {
    const video = videoRef.current as any;
    const container = containerRef.current as any;
    if (!video || !container) return;

    if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
      return;
    }

    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`
        group relative bg-black overflow-hidden outline-none
        ${isFullscreen ? "w-screen h-screen rounded-none" : "w-full rounded-lg"}
      `}
    >
      {/* VIDEO */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="metadata"
        playsInline
        controls={!isDesktop}
        className={`
          bg-black
          ${isFullscreen ? "w-full h-full object-contain" : "w-full"}
        `}
      />

      {/* OVERLAY PLAY */}
      {isDesktop && !isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-white text-6xl opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ▶
        </button>
      )}

      {/* CONTROLES DESKTOP */}
      {isDesktop && (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="pointer-events-auto relative z-20 px-6 pb-6 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* PROGRESS */}
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              onChange={(e) =>
                (videoRef.current!.currentTime = Number(e.target.value))
              }
              style={{
                background: `linear-gradient(
                  to right,
                  #dc2626 ${progress}%,
                  rgba(255,255,255,0.3) ${progress}%
                )`,
              }}
              className="
                w-full h-1 appearance-none cursor-pointer rounded-full
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-red-600
                [&::-webkit-slider-thumb]:opacity-0
                hover:[&::-webkit-slider-thumb]:opacity-100
              "
            />

            {/* CONTROLES */}
            <div
              className={`
                mt-4 flex items-center justify-between text-white
                ${isFullscreen ? "text-2xl" : "text-xl"}
              `}
            >
              <div className="flex items-center gap-6">
                <button onClick={togglePlay} className="hover:scale-110 transition">
                  {isPlaying ? "❚❚" : "▶"}
                </button>

                <button
                  onClick={() => skip(-5)}
                  className="hover:scale-110 transition icon-interactive"
                >
                  <Image
                    src="/icons/minus-5-seconds.png"
                    alt="Retroceder 5 segundos"
                    width={24}
                    height={24}
                  />
                </button>

                <button
                  onClick={() => skip(5)}
                  className="hover:scale-110 transition icon-interactive"
                >
                  <Image
                    src="/icons/plus-5-seconds.png"
                    alt="Avanzar 5 segundos"
                    width={24}
                    height={24}
                  />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => changeVolume(Number(e.target.value) - volume)}
                  className="
                    icon-interactive
                    w-24 h-1 rounded-full appearance-none
                    bg-white/30
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-3
                    [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-white
                  "
                />

                <button onClick={fullscreen} className="hover:scale-110 transition icon-interactive">
                  {isFullscreen ? "🡼" : "⛶"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
