import fsPromises from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import type { MediaCatalogItem } from "@/types/media";
import {
  fsExists,
  fsStatOrNull,
  scanMediaFolder,
  buildCoverUrl,
  buildVideoUrl,
  buildTitleFromFolder,
} from "@/lib/media-scanner";
import { CATALOG_CACHE_KEY, get, set, invalidate } from "@/lib/media-cache";

export const dynamic = "force-dynamic";

const MEDIA_BASE_DIR = path.join(process.cwd(), "../movies-files");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-folder-name, x-upload-id",
  "Access-Control-Allow-Credentials": "true",
  "Vary": "Origin",
} as const;

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET() {
  try {
    // Return cached catalog if still fresh (Issue 12: 5.3)
    const cached = get<MediaCatalogItem[]>(CATALOG_CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    if (!(await fsExists(MEDIA_BASE_DIR))) {
      return NextResponse.json([]);
    }

    const folders = (await fsPromises.readdir(MEDIA_BASE_DIR)).filter((folder) =>
      folder.startsWith(".") === false
    );

    const items = await Promise.all(
      folders.map(async (folder): Promise<MediaCatalogItem | null> => {
        const folderPath = path.join(MEDIA_BASE_DIR, folder);
        const stat = await fsStatOrNull(folderPath);
        if (!stat || !stat.isDirectory()) {
          return null;
        }

        const scanResult = await scanMediaFolder(folderPath);

        const { coverFile, effectiveVideoFile, metadata, type, seasonNumbers, folderName } = scanResult;

        if (type === "movie" && !effectiveVideoFile) {
          return null;
        }

        const infoJsonPath = path.join(folderPath, "info.json");
        const infoJson = (await fsExists(infoJsonPath))
          ? await fsPromises.readFile(infoJsonPath, "utf-8")
          : "";

        return {
          id: folderName,
          folderName,
          title: buildTitleFromFolder(folderName, metadata.title),
          year: metadata.year,
          duration: metadata.duration,
          description: metadata.description,
          infoJson,
          seasons: seasonNumbers,
          cover: buildCoverUrl(folderName, coverFile),
          video:
            type === "movie"
              ? effectiveVideoFile
                ? buildVideoUrl(folderName, effectiveVideoFile)
                : ""
              : undefined,
          type,
        };
      })
    );

    const result = items.filter(Boolean) as MediaCatalogItem[];

    // Cache the result so subsequent requests skip the expensive filesystem scan
    set(CATALOG_CACHE_KEY, result);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const folderName = String(url.searchParams.get("folderName") || "").trim();

    if (!folderName) {
      return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    }

    const allowedBase = path.resolve(MEDIA_BASE_DIR);

    // Resolve symlinks on allowed base (Issue 1.1)
    let allowedBaseReal: string;
    try {
      allowedBaseReal = await fsPromises.realpath(allowedBase);
    } catch {
      return NextResponse.json({ error: "Media directory not found" }, { status: 404 });
    }

    const targetPath = path.join(MEDIA_BASE_DIR, folderName);

    // Resolve symlinks to prevent path traversal via symlinks (Issue 1.1)
    let realPath: string;
    try {
      realPath = await fsPromises.realpath(targetPath);
    } catch {
      return NextResponse.json({ error: "Media folder not found" }, { status: 404 });
    }

    if (!realPath.startsWith(allowedBaseReal + path.sep)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const targetStat = await fsStatOrNull(realPath);
    if (!targetStat || !targetStat.isDirectory()) {
      return NextResponse.json({ error: "Media folder not found" }, { status: 404 });
    }

    await fsPromises.rm(realPath, { recursive: true, force: true });

    // Invalidate the catalog cache so the next GET reflects the deletion
    invalidate(CATALOG_CACHE_KEY);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
