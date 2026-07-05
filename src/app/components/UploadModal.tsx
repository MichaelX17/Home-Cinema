"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PlusCircle, Trash2, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface MediaItemForModal {
  folderName: string;
  title: string;
  description?: string;
  infoJson?: string;
  seasons?: number[];
  type: "movie" | "series";
}

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  itemToEdit?: MediaItemForModal | null;
  onSaved?: () => void;
}

export default function UploadModal({ open, onClose, itemToEdit, onSaved }: UploadModalProps) {
  const [mediaType, setMediaType] = useState<"movie" | "series">("movie");
  const [folderName, setFolderName] = useState("");
  const [infoText, setInfoText] = useState("");
  const [useInfoFile, setUseInfoFile] = useState(false);
  const [seasons, setSeasons] = useState<Array<{ id: number; files: File[] }>>([]);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [movieFile, setMovieFile] = useState<File | null>(null);
  const [infoFile, setInfoFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const CHUNK_SIZE = 10 * 1024 * 1024;

  const [mounted, setMounted] = useState(open);
  const [isClosing, setIsClosing] = useState(false);

  const isEditing = Boolean(itemToEdit);
  const toast = useToast();

  const resetForm = (editingItem?: MediaItemForModal | null) => {
    setMediaType(editingItem?.type === "series" ? "series" : "movie");
    setFolderName(editingItem?.folderName || "");
    setInfoText(editingItem?.infoJson || editingItem?.description || "");
    setUseInfoFile(false);
    setSeasons(
      editingItem?.type === "series" && editingItem.seasons?.length
        ? editingItem.seasons.map((seasonNumber) => ({ id: seasonNumber, files: [] }))
        : []
    );
    setCoverFile(null);
    setMovieFile(null);
    setInfoFile(null);
    setErrors([]);
    setUploadProgress(0);
    setUploading(false);
  };

  useEffect(() => {
    if (open) {
      setMounted(true);
      setIsClosing(false);
      resetForm(itemToEdit);
    } else if (mounted) {
      setIsClosing(true);
      const t = window.setTimeout(() => setMounted(false), 260);
      return () => window.clearTimeout(t);
    }
  }, [open, itemToEdit]);

  if (!mounted) return null;

  function addSeason() {
    setSeasons((s) => [...s, { id: s.length + 1, files: [] }]);
  }

  function removeSeason(id: number) {
    setSeasons((s) => s.filter((x) => x.id !== id));
  }

  function handleSeasonFiles(id: number, files: FileList | null) {
    if (!files) return;
    setSeasons((s) => s.map((x) => (x.id === id ? { ...x, files: Array.from(files) } : x)));
  }

  function handleCoverChange(files: FileList | null) {
    const file = files?.[0] ?? null;
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrors((e) => [...e, "Cover must be an image"]);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrors((e) => [...e, "Cover too large (max 10MB)"]);
        return;
      }
    }
    setCoverFile(file);
  }

  function handleMovieFileChange(files: FileList | null) {
    const file = files?.[0] ?? null;
    if (file) {
      if (!file.type.startsWith("video/")) {
        setErrors((e) => [...e, "File must be a video"]);
        return;
      }
      if (file.size > 5 * 1024 * 1024 * 1024) {
        setErrors((e) => [...e, "Video too large (max 5GB)"]);
        return;
      }
    }
    setMovieFile(file);
  }

  function handleInfoFileChange(files: FileList | null) {
    const file = files?.[0] ?? null;
    if (file) {
      if (file.type !== "application/json") {
        setErrors((e) => [...e, "Info file must be JSON"]);
        return;
      }
    }
    setInfoFile(file);
  }

  async function handleDelete() {
    if (!itemToEdit) return;
    const confirmed = window.confirm(`Remove "${itemToEdit.folderName}" from your collection?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/media?folderName=${encodeURIComponent(itemToEdit.folderName)}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Unable to remove media");
      }
      toast.show({ title: "Removed", description: `${itemToEdit.title} was removed.`, variant: "success" });
      onSaved?.();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to remove media";
      toast.show({ title: "Error", description: message, variant: "error" });
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors([]);

    const newErrors: string[] = [];
    const trimmedFolder = folderName.trim();
    if (!trimmedFolder && !itemToEdit?.folderName) newErrors.push("Folder name is required");
    if (!isEditing && mediaType === "movie" && !movieFile) newErrors.push("Please select the movie file");
    if (mediaType === "movie" && movieFile && !movieFile.type.startsWith("video/")) newErrors.push("Invalid movie file");
    if (coverFile && !coverFile.type.startsWith("image/")) newErrors.push("Invalid cover file");

    if (newErrors.length) {
      setErrors(newErrors);
      return;
    }

    const normalizedFolder = trimmedFolder || itemToEdit?.folderName || `media-${Date.now()}`;
    const shouldReplaceMedia = isEditing && mediaType === "movie" && Boolean(movieFile);

    const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
    const buildHeaders = (fileName: string, chunkIndex: number, totalChunks: number, filePath?: string) => {
      const headers = new Headers();
      headers.set("x-file-name", encodeURIComponent(fileName));
      headers.set("x-chunk-index", String(chunkIndex));
      headers.set("x-total-chunks", String(totalChunks));
      headers.set("x-folder-name", encodeURIComponent(normalizedFolder));
      if (filePath) headers.set("x-file-path", encodeURIComponent(filePath));
      return headers;
    };

    const uploadChunk = async (chunk: Blob, fileName: string, chunkIndex: number, totalChunks: number, filePath?: string) => {
      const headers = buildHeaders(fileName, chunkIndex, totalChunks, filePath);
      let lastError: unknown;

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error("Upload aborted by user");
        }

        try {
          headers.set("content-type", "application/octet-stream");
          const response = await fetch("/api/upload", {
            method: "POST",
            headers,
            body: chunk,
            signal: abortControllerRef.current?.signal,
          });

          if (!response.ok) {
            const data = await response.json().catch(() => null);
            const message = data?.error || `${response.status} ${response.statusText}`;
            throw new Error(message);
          }

          return;
        } catch (error) {
          lastError = error;
          if (attempt < 3) {
            await delay(500 * attempt);
            continue;
          }
          throw lastError;
        }
      }
    };

    const uploadFileInChunks = async (file: File, filePath?: string, uploadedBytesStart = 0) => {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let uploadedBytes = uploadedBytesStart;

      for (let index = 0; index < totalChunks; index += 1) {
        const start = index * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        await uploadChunk(chunk, file.name, index, totalChunks, filePath);
        uploadedBytes += chunk.size;
        const percent = Math.min(100, Math.round((uploadedBytes / file.size) * 100));
        setUploadProgress(percent);
      }
    };

    const metadataForm = new FormData();
    metadataForm.append("mode", isEditing ? "edit" : "create");
    metadataForm.append("mediaType", mediaType);
    metadataForm.append("folderName", normalizedFolder);
    if (isEditing && itemToEdit?.folderName) {
      metadataForm.append("existingFolder", itemToEdit.folderName);
    }
    if (shouldReplaceMedia) {
      metadataForm.append("replaceMedia", "true");
    }

    if (useInfoFile && infoFile) {
      metadataForm.append("infoFile", infoFile);
    } else if (infoText) {
      metadataForm.append("info", infoText);
    }

    if (coverFile) {
      metadataForm.append("cover", coverFile);
    }

    const uploadFiles: Array<{ file: File; path: string }> = [];

    if (mediaType === "series") {
      seasons.forEach((season) => {
        season.files.forEach((file) => {
          uploadFiles.push({ file, path: `season-${season.id}/${file.name}` });
        });
      });
    }

    setUploading(true);
    setUploadProgress(0);
    abortControllerRef.current = new AbortController();

    try {
      const metadataResponse = await fetch("/api/upload", {
        method: "POST",
        body: metadataForm,
        signal: abortControllerRef.current.signal,
      });

      if (!metadataResponse.ok) {
        const metadataBody = await metadataResponse.json().catch(() => null);
        const metadataError = metadataBody?.error || `${metadataResponse.status} ${metadataResponse.statusText}`;
        throw new Error(`Metadata upload failed: ${metadataError}`);
      }

      if (mediaType === "movie" && movieFile) {
        uploadFiles.push({ file: movieFile, path: movieFile.name });
      }

      for (const { file, path } of uploadFiles) {
        await uploadFileInChunks(file, path);
      }

      setUploadProgress(100);
      toast.show({
        title: isEditing ? "Changes saved" : "Upload completed",
        description: isEditing ? `"${normalizedFolder}" was updated.` : `"${normalizedFolder}" added.`,
        variant: "success",
      });
      onSaved?.();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setErrors([message]);
      toast.show({ title: "Error", description: message, variant: "error" });
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isClosing ? "pointer-events-none" : ""}`}>
      <div className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity ${isClosing ? "opacity-0" : "opacity-100"}`} onClick={() => { if (!uploading) onClose(); }} />

      <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-3xl p-4">
        <Card className={`h-full max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 ${isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900 to-sky-950/80 opacity-90" />
          <div className="relative z-10 flex h-full flex-col">
            <CardHeader className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{isEditing ? "Edit Media" : "Upload Media"}</CardTitle>
                <CardDescription>{isEditing ? "Update the current movie or series details and files." : "Add a movie or series to your local collection"}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="grid grid-cols-1 gap-4 overflow-y-auto pb-4 sm:grid-cols-2" style={{ maxHeight: "calc(90vh - 250px)" }}>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Type</label>
                <Select value={mediaType} onValueChange={(value) => setMediaType(value as "movie" | "series")}>
                  <SelectTrigger className="bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="movie">Movie</SelectItem>
                    <SelectItem value="series">Series</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Folder</label>
                <Input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="folder-name" />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Cover</label>
                <label className="group relative block w-full cursor-pointer overflow-hidden rounded-2xl border border-border bg-slate-950/80 px-4 py-4 text-sm text-white transition hover:border-primary hover:bg-slate-900">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="block truncate">{coverFile ? coverFile.name : "Select cover"}</span>
                    </div>
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white transition group-hover:bg-primary/90">Choose</span>
                  </div>
                  <input id="cover" type="file" accept="image/*" className="sr-only" onChange={(e) => handleCoverChange(e.target.files)} />
                </label>
                {coverFile && (
                  <div className="mt-3 grid gap-1 rounded-2xl border border-border bg-slate-950/70 px-3 py-3 text-xs text-muted-foreground sm:text-sm">
                    <div className="truncate text-white font-medium">{coverFile.name}</div>
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                      <span>{(coverFile.size / 1024 / 1024).toFixed(2)} MB</span>
                      <span>{coverFile.type || "Image"}</span>
                    </div>
                  </div>
                )}
              </div>

              {mediaType === "movie" ? (
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Video file</label>
                  <label className="group relative block w-full cursor-pointer overflow-hidden rounded-2xl border border-border bg-slate-950/80 px-4 py-4 text-sm text-white transition hover:border-primary hover:bg-slate-900">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="block truncate">{movieFile ? movieFile.name : "Select video"}</span>
                      </div>
                      <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white transition group-hover:bg-primary/90">Choose</span>
                    </div>
                    <input id="movieFile" type="file" accept="video/*" className="sr-only" onChange={(e) => handleMovieFileChange(e.target.files)} />
                  </label>
                  {movieFile && (
                    <div className="mt-3 grid gap-1 rounded-2xl border border-border bg-slate-950/70 px-3 py-3 text-xs text-muted-foreground sm:text-sm">
                      <div className="truncate text-white font-medium">{movieFile.name}</div>
                      <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                        <span>{(movieFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        <span>{movieFile.type || "Video"}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="col-span-full">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PlusCircle className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">Seasons</h4>
                    </div>
                    <Button type="button" onClick={addSeason}>Add Season</Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {seasons.map((season) => (
                      <div key={season.id} className="group relative overflow-hidden rounded-3xl border border-sky-700 bg-sky-950/90 p-4 transition hover:-translate-y-0.5 hover:bg-sky-900 hover:shadow-[0_0_30px_rgba(59,130,246,0.25)]">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm uppercase tracking-[0.2em] text-sky-300/80">SEASON</p>
                            <h3 className="mt-2 text-lg font-semibold text-white">{season.id}</h3>
                          </div>
                          <div className="flex flex-col items-end gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            <button type="button" className="inline-flex h-8 w-20 items-center justify-center rounded-full border border-sky-500 bg-sky-800/80 text-xs font-medium text-white transition hover:bg-sky-700" onClick={() => document.getElementById(`season-file-${season.id}`)?.click()}>Edit</button>
                            <button type="button" className="inline-flex h-8 w-20 items-center justify-center rounded-full border border-red-600 bg-slate-950/80 text-xs font-medium text-white transition hover:border-red-500 hover:bg-red-700" onClick={() => removeSeason(season.id)}>Delete</button>
                          </div>
                        </div>
                        <div className="mt-4">
                          <input id={`season-file-${season.id}`} type="file" accept="video/*" multiple className="sr-only" onChange={(e) => handleSeasonFiles(season.id, e.target.files)} />
                          {season.files.length === 0 ? (
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm text-white">No episodes</div>
                              <button type="button" onClick={() => document.getElementById(`season-file-${season.id}`)?.click()} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary/90">+</button>
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-white">{`${season.files.length} Episodes selected`}</div>
                          )}
                          {season.files.length > 0 && (
                            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                              {season.files.slice(0, 2).map((file, index) => (
                                <li key={`${file.name}-${index}`} className="truncate">{file.name} • {(file.size / 1024 / 1024).toFixed(2)} MB</li>
                              ))}
                              {season.files.length > 2 && <li className="text-xs text-slate-400">+{season.files.length - 2} more...</li>}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="col-span-full">
                <div className="mb-2 flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-3 rounded-full bg-muted/20 px-3 py-2 transition hover:bg-muted/30">
                    <span className="relative">
                      <input type="checkbox" className="peer sr-only" checked={useInfoFile} onChange={(e) => setUseInfoFile(e.target.checked)} />
                      <span className="block h-6 w-11 rounded-full bg-slate-700 transition peer-checked:bg-primary"></span>
                      <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-md transition peer-checked:translate-x-5"></span>
                    </span>
                    <span className="text-sm text-muted-foreground">Load info.json</span>
                  </label>
                </div>

                {useInfoFile ? (
                  <label className="group relative block w-full cursor-pointer overflow-hidden rounded-2xl border border-border bg-slate-950/80 px-4 py-4 text-sm text-white transition hover:border-primary hover:bg-slate-900">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="relative overflow-hidden pr-8">
                          <span className="block truncate">{infoFile ? infoFile.name : "Select info.json"}</span>
                          <span className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-950/80 to-transparent" />
                        </div>
                      </div>
                      <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white transition group-hover:bg-primary/90">Choose</span>
                    </div>
                    <input id="infoFile" type="file" accept="application/json" className="sr-only" onChange={(e) => handleInfoFileChange(e.target.files)} />
                  </label>
                ) : (
                  <textarea value={infoText} onChange={(e) => setInfoText(e.target.value)} rows={6} className="w-full rounded-2xl border border-border bg-slate-950/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary" placeholder='{"title":"My Movie", "type":"movie"}' />
                )}
              </div>
            </CardContent>

            <div className="px-6 pb-4">
              {errors.length > 0 && (
                <div className="mb-3 rounded-md bg-destructive/10 p-3 text-destructive">
                  <ul className="text-sm">
                    {errors.map((error, index) => (
                      <li key={`${error}-${index}`}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mb-3">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{uploading ? `Uploading ${uploadProgress}%` : "Ready"}</div>
              </div>

              <CardFooter className="justify-between gap-3 p-0">
                <div>
                  {isEditing && (
                    <Button type="button" variant="destructive" onClick={handleDelete} disabled={uploading}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => { if (!uploading) onClose(); else abortControllerRef.current?.abort(); }} type="button">{uploading ? "Cancel" : "Cancel"}</Button>
                  <Button type="submit" disabled={uploading}>{uploading ? `Saving ${uploadProgress}%` : isEditing ? "Save changes" : "Upload"}</Button>
                </div>
              </CardFooter>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
