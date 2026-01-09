"use client";

import { FC } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, ExternalLink, Share2 } from "lucide-react";

interface MovieControlsProps {
  movie: {
    title: string;
    video: string;
  };
}

const MovieControls: FC<MovieControlsProps> = ({ movie }) => {
  return (
    <div className="p-4 rounded-lg bg-card border border-border mt-8">
      <h2 className="text-xl font-bold mb-4 text-primary">Playback Options2</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Button
          className="icon-interactive"
          variant="outline"
          onClick={() => {
            localStorage.removeItem(`progress_${movie.title}`);
            window.location.reload();
          }}
        >
          <RefreshCcw size={16} className="mr-2" />
          Reset Progress
        </Button>
        <Button
          className="icon-interactive"
          variant="outline"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.open(movie.video, "_blank");
            }
          }}
        >
          <ExternalLink size={16} className="mr-2" />
          Open in New Tab
        </Button>
        <Button
          className="icon-interactive"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            // Consider adding a toast notification for better UX
          }}
        >
          <Share2 size={16} className="mr-2" />
          Copy Link
        </Button>
      </div>
    </div>
  );
};

export default MovieControls;
