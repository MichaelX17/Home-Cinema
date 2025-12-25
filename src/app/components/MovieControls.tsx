"use client";

import { FC } from "react";
import { Button } from "@/components/ui/button";

interface MovieControlsProps {
  movie: {
    title: string;
    video: string;
  };
}

const MovieControls: FC<MovieControlsProps> = ({ movie }) => {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Controls</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Button
          variant="outline"
          onClick={() => {
            localStorage.removeItem(`progress_${movie.title}`);
            window.location.reload();
          }}
        >
          <span className="mr-2">🔄</span>
          Reset Progress
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.open(movie.video, "_blank");
            }
          }}
        >
          <span className="mr-2">↗️</span>
          Open in New Tab
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            // alert("Link copied to clipboard!");
          }}
        >
          <span className="mr-2">🔗</span>
          Copy Link
        </Button>
      </div>
    </div>
  );
};

export default MovieControls;
