"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

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
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [showPlayPauseIcon, setShowPlayPauseIcon] = useState(false);
  const [isInactive, setIsInactive] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const cursorTimer = useRef<NodeJS.Timeout | null>(null);

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
  
  /* ===== Inactividad y cursor ===== */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isDesktop) return;

    const resetTimers = () => {
      // Limpiar timers de inactividad
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
      
      // Timer para ocultar cursor (más corto que el de controles)
      if (cursorTimer.current) {
        clearTimeout(cursorTimer.current);
      }
      
      // Mostrar cursor inmediatamente
      setShowCursor(true);
      
      // Ocultar cursor después de 1 segundo (si está reproduciendo)
      if (isPlaying) {
        cursorTimer.current = setTimeout(() => {
          setShowCursor(false);
        }, 1000);
      }
    };

    // Si no está reproduciendo, controles y cursor siempre visibles
    if (!isPlaying) {
      setIsInactive(false);
      setShowCursor(true);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
      return;
    }

    const handleActivity = () => {
      setIsInactive(false); // Mostrar controles
      resetTimers();
      
      // Ocultar controles después de 3 segundos
      inactivityTimer.current = setTimeout(() => {
        setIsInactive(true);
      }, 3000);
    };

    const handleMouseLeave = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
      setIsInactive(true);
      setShowCursor(true); // Mostrar cursor al salir
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleActivity();
      // Forzar actualización de posición del cursor
      container.style.setProperty('--mouse-x', `${e.clientX}px`);
      container.style.setProperty('--mouse-y', `${e.clientY}px`);
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    // Iniciar la secuencia de inactividad
    handleActivity();

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isDesktop, isPlaying]);

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

  const handleVideoClick = () => {
    if (isDesktop) {
      if (clickTimer) {
        clearTimeout(clickTimer);
        setClickTimer(null);
        fullscreen();
      } else {
        const timer = setTimeout(() => {
          togglePlay();
          setShowPlayPauseIcon(true);
          setTimeout(() => setShowPlayPauseIcon(false), 500);
          setClickTimer(null);
        }, 300);
        setClickTimer(timer);
      }
    }
  };

  const handleOverlayClick = () => {
    if (isDesktop && !isPlaying) {
      togglePlay();
      setShowPlayPauseIcon(true);
      setTimeout(() => setShowPlayPauseIcon(false), 500);
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`
        relative bg-black overflow-hidden outline-none
        ${isFullscreen ? "w-screen h-screen rounded-none" : "w-full rounded-lg"}
        ${!showCursor ? "cursor-none" : "cursor-auto"}
        ${isInactive ? "player-inactive" : ""}
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
        onClick={handleVideoClick}
        className={`
          bg-black w-full h-full
          ${isFullscreen ? "object-contain" : ""}
        `}
      />

      {/* OVERLAY PLAY */}
      {isDesktop && !isPlaying && (
        <div
          onClick={handleOverlayClick}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-100 transition-opacity"
        >
          <Image
            src="/icons/play.png"
            alt="Play"
            width={80}
            height={80}
            className="w-20 h-20"
          />
        </div>
      )}

      {/* CONTROLES DESKTOP */}
      {isDesktop && (
        <div className={`
          pointer-events-none absolute inset-0 flex flex-col justify-end
          transition-opacity duration-300
          ${isInactive ? "opacity-0" : "opacity-100"}
        `}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          <div className={`relative z-20 px-6 pb-6 ${isInactive ? "pointer-events-none" : "pointer-events-auto"}`}>
            {/* PROGRESS */}
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              onChange={(e) =>
                videoRef.current && (videoRef.current.currentTime = Number(e.target.value))
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

            {/* CONTROLES - Ahora con iconos personalizados */}
            <div
              className={`
                mt-4 flex items-center justify-between text-white
                ${isFullscreen ? "text-2xl" : "text-xl"}
              `}
            >
              <div className="flex items-center gap-6">
                <button
                  onClick={togglePlay}
                  className="hover:scale-110 transition flex items-center justify-center w-10 h-10 icon-interactive"
                >
                  {isPlaying ? (
                    <Image
                      src="/icons/pause_icon.png"
                      alt="Pause"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                  ) : (
                    <Image
                      src="/icons/play_icon.png"
                      alt="Play"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                  )}
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
                  style={{
                    background: `linear-gradient(
                    to right,
                    white 0%,
                    white ${volume * 100}%,
                    rgba(255,255,255,0.3) ${volume * 100}%,
                    rgba(255,255,255,0.3) 100%
                  )`,
                  }}
                  className=" 
                  icon-interactive
                  w-24 h-1.5 rounded-full appearance-none
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-white
                "
                />

                <button onClick={fullscreen} className="hover:scale-110 transition icon-interactive flex items-center justify-center w-10 h-10">
                  {isFullscreen ? (
                    <Image
                      src="/icons/fullscreen_out_icon.png"
                      alt="Exit fullscreen"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                  ) : (
                    <Image
                      src="/icons/fullscreen_in_icon.png"
                      alt="Enter fullscreen"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cursa la desaparición del cursor sobre todo el vídeo */}
      {isInactive && <div className="absolute inset-0 z-50 cursor-none" />}
    </div>
  );
}