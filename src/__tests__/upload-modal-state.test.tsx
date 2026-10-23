import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import UploadModal from "@/app/components/UploadModal";
import ToastProvider from "@/components/ui/toast";

describe("UploadModal", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({}),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the selected files while an upload is in progress", async () => {
    render(
      <ToastProvider>
        <UploadModal open={true} onClose={vi.fn()} />
      </ToastProvider>
    );

    fireEvent.change(screen.getByPlaceholderText("folder-name"), {
      target: { value: "demo-folder" },
    });

    const coverInput = document.querySelector("#cover") as HTMLInputElement;
    const movieInput = document.querySelector("#movieFile") as HTMLInputElement;

    const coverFile = new File(["cover"], "cover.png", { type: "image/png" });
    const movieFile = new File(["movie"], "movie.mp4", { type: "video/mp4" });

    fireEvent.change(coverInput, { target: { files: [coverFile] } });
    fireEvent.change(movieInput, { target: { files: [movieFile] } });

    expect(screen.getByText("cover.png")).toBeInTheDocument();
    expect(screen.getByText("movie.mp4")).toBeInTheDocument();

    fireEvent.submit(document.querySelector("form") as HTMLFormElement);

    await Promise.resolve();

    expect(screen.getByText("cover.png")).toBeInTheDocument();
    expect(screen.getByText("movie.mp4")).toBeInTheDocument();
  });
});
