"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { X, PlusCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

export default function UploadModal({ open, onClose }: UploadModalProps) {
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

  const toast = useToast();

  useEffect(() => {
    if (open) {
      setMounted(true);
      setIsClosing(false);
    } else if (mounted) {
      // start closing animation
      setIsClosing(true);
      const t = setTimeout(() => setMounted(false), 260);
      return () => clearTimeout(t);
    }
  }, [open]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);

    const newErrors: string[] = [];
    if (!folderName) newErrors.push("Folder name is required");
    if (mediaType === "movie" && !movieFile) newErrors.push("Please select the movie file");
    if (mediaType === "movie" && movieFile && !movieFile.type.startsWith("video/")) newErrors.push("Invalid movie file");
    if (coverFile && !coverFile.type.startsWith("image/")) newErrors.push("Invalid cover file");

    if (newErrors.length) {
      setErrors(newErrors);
      return;
    }

    const normalizedFolder = folderName || `media-${Date.now()}`;

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const buildHeaders = (fileName: string, chunkIndex: number, totalChunks: number, filePath?: string) => {
      const headers = new Headers();
      headers.set("x-file-name", fileName);
      headers.set("x-chunk-index", String(chunkIndex));
      headers.set("x-total-chunks", String(totalChunks));
      headers.set("x-folder-name", normalizedFolder);
      if (filePath) headers.set("x-file-path", filePath);
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
    metadataForm.append("mediaType", mediaType);
    metadataForm.append("folderName", normalizedFolder);

    if (useInfoFile && infoFile) {
      metadataForm.append("infoFile", infoFile);
    } else if (infoText) {
      metadataForm.append("info", infoText);
    }

    if (coverFile) {
      metadataForm.append("cover", coverFile);
    }

    if (mediaType === "series") {
      seasons.forEach((season) => {
        season.files.forEach((file) => metadataForm.append(`season-${season.id}`, file));
      });
    }

    setUploading(true);
    setUploadProgress(0);
    abortControllerRef.current = new AbortController();

    try {
      if (mediaType === "movie" && movieFile) {
        await fetch("/api/upload", {
          method: "POST",
          body: metadataForm,
          signal: abortControllerRef.current.signal,
        });

        await uploadFileInChunks(movieFile);
      } else {
        await fetch("/api/upload", {
          method: "POST",
          body: metadataForm,
          signal: abortControllerRef.current.signal,
        });
      }

      setUploadProgress(100);
      toast.show({ title: "Upload completed", description: `"${normalizedFolder}" added.`, variant: "success" });
      onClose();
      setTimeout(() => window.location.reload(), 700);
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
        <Card className={`h-full max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 ${isClosing ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900 to-sky-950/80 opacity-90 pointer-events-none" />
          <div className="relative z-10 flex h-full flex-col">
          <CardHeader className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Upload Media</CardTitle>
              <CardDescription>Add a movie or series to your local collection</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pb-4" style={{ maxHeight: 'calc(90vh - 250px)' }}>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Tipo</label>
              <Select value={mediaType} onValueChange={(v: any) => setMediaType(v)}>
                <SelectTrigger className="bg-transparent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="movie">Pelicula</SelectItem>
                  <SelectItem value="series">Serie</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Carpeta destino</label>
              <Input value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="folder-name" />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Cover</label>
              <label className="group relative cursor-pointer block w-full overflow-hidden rounded-2xl border border-border bg-slate-950/80 px-4 py-4 text-sm text-white transition hover:border-primary hover:bg-slate-900">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block truncate">{coverFile ? coverFile.name : "Seleccionar cover"}</span>
                  </div>
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white transition group-hover:bg-primary/90">Elegir</span>
                </div>
                <input id="cover" type="file" accept="image/*" className="sr-only" onChange={(e) => handleCoverChange(e.target.files)} />
              </label>
              {coverFile && (
                <div className="mt-3 grid gap-1 rounded-2xl border border-border bg-slate-950/70 px-3 py-3 text-xs text-muted-foreground sm:text-sm">
                  <div className="truncate text-white font-medium">{coverFile.name}</div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                    <span>{(coverFile.size / 1024 / 1024).toFixed(2)} MB</span>
                    <span>{coverFile.type || "Imagen"}</span>
                  </div>
                </div>
              )}
            </div>

            {mediaType === "movie" ? (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Archivo de video</label>
                <label className="group relative cursor-pointer block w-full overflow-hidden rounded-2xl border border-border bg-slate-950/80 px-4 py-4 text-sm text-white transition hover:border-primary hover:bg-slate-900">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="block truncate">{movieFile ? movieFile.name : "Seleccionar video"}</span>
                    </div>
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white transition group-hover:bg-primary/90">Elegir</span>
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
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <PlusCircle className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Seasons</h4>
                      </div>
                      <Button type="button" onClick={addSeason}>Add Season</Button>
                    </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {seasons.map((s) => (
                        <div key={s.id} className="group relative overflow-hidden rounded-3xl border border-sky-700 bg-sky-950/90 p-4 transition hover:-translate-y-0.5 hover:bg-sky-900 hover:shadow-[0_0_30px_rgba(59,130,246,0.25)]">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-sm uppercase tracking-[0.2em] text-sky-300/80">SEASON</p>
                                <h3 className="mt-2 text-lg font-semibold text-white">{s.id}</h3>
                            </div>
                            <div className="flex flex-col items-end gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                              <button type="button" className="inline-flex items-center justify-center w-20 h-8 text-xs font-medium rounded-full border border-sky-500 bg-sky-800/80 text-white hover:bg-sky-700 cursor-pointer transition" onClick={() => document.getElementById(`season-file-${s.id}`)?.click()}>Edit</button>
                              <button type="button" className="inline-flex items-center justify-center w-20 h-8 text-xs font-medium rounded-full border border-red-600 bg-slate-950/80 text-white hover:bg-red-700 hover:border-red-500 cursor-pointer transition" onClick={() => removeSeason(s.id)}>Delete</button>
                            </div>
                          </div>
                          <div className="mt-4">
                            <input id={`season-file-${s.id}`} type="file" accept="video/*" multiple className="sr-only" onChange={(e) => handleSeasonFiles(s.id, e.target.files)} />
                            {s.files.length === 0 ? (
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm text-white">No episodes</div>
                                <button type="button" onClick={() => document.getElementById(`season-file-${s.id}`)?.click()} className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white hover:bg-primary/90 cursor-pointer transition">+</button>
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-white">{`${s.files.length} Episodes selected`}</div>
                            )}
                            {s.files.length > 0 && (
                              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                                {s.files.slice(0,2).map((f, i) => (
                                  <li key={i} className="truncate">{f.name} • {(f.size / 1024 / 1024).toFixed(2)} MB</li>
                                ))}
                                {s.files.length > 2 && (
                                  <li className="text-xs text-slate-400">+{s.files.length - 2} more...</li>
                                )}
                              </ul>
                            )}
                          </div>
                        </div>
                      ))}
                </div>
              </div>
            )}

            <div className="col-span-full">
              <div className="flex items-center gap-3 mb-2">
              <label className="inline-flex items-center cursor-pointer gap-3 rounded-full bg-muted/20 px-3 py-2 transition hover:bg-muted/30">
                <span className="relative">
                  <input type="checkbox" className="sr-only peer" checked={useInfoFile} onChange={(e) => setUseInfoFile(e.target.checked)} />
                  <span className="block h-6 w-11 rounded-full bg-slate-700 transition peer-checked:bg-primary"></span>
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-md transition peer-checked:translate-x-5"></span>
                </span>
                <span className="text-sm text-muted-foreground">Cargar info.json</span>
              </label>
            </div>

              {useInfoFile ? (
                <label className="group relative cursor-pointer block w-full overflow-hidden rounded-2xl border border-border bg-slate-950/80 px-4 py-4 text-sm text-white transition hover:border-primary hover:bg-slate-900">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="relative overflow-hidden pr-8">
                        <span className="block truncate">{infoFile ? infoFile.name : "Seleccionar info.json"}</span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-950/80 to-transparent" />
                      </div>
                    </div>
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white transition group-hover:bg-primary/90">Elegir</span>
                  </div>
                  <input id="infoFile" type="file" accept="application/json" className="sr-only" onChange={(e) => handleInfoFileChange(e.target.files)} />
                </label>
              ) : (
                <textarea className="w-full p-3 rounded-md bg-transparent border border-input text-sm text-white placeholder:text-muted-foreground" placeholder='{"title":"My Movie", "type":"movie"}' value={infoText} onChange={(e) => setInfoText(e.target.value)} rows={6} />
              )}
            </div>
          </CardContent>

          <div className="px-6 pb-4">
            {errors.length > 0 && (
              <div className="mb-3 p-3 bg-destructive/10 text-destructive rounded-md">
                <ul className="text-sm">
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mb-3">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">{uploading ? `Uploading ${uploadProgress}%` : "Ready"}</div>
            </div>

            <CardFooter className="justify-end gap-3 p-0">
              <Button variant="ghost" onClick={() => { if (!uploading) onClose(); else xhrRef.current?.abort(); }} type="button">{uploading ? "Cancelar" : "Cancelar"}</Button>
              <Button type="submit" disabled={uploading}>{uploading ? `Subiendo ${uploadProgress}%` : "Subir"}</Button>
            </CardFooter>
          </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
