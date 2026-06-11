import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";

// Mapeo de MIME types a extensiones (puedes ampliarlo según necesites)
const mimeToExt: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/x-matroska": ".mkv",
  "video/quicktime": ".mov",
  "video/x-msvideo": ".avi",
  "video/webm": ".webm",
  "application/json": ".json",
};

// Obtener extensión a partir del MIME type
const getExtensionFromMime = (mimeType?: string): string => {
  if (!mimeType) return "";
  const normalized = mimeType.toLowerCase();
  return mimeToExt[normalized] || "";
};

// Sanitiza el nombre: elimina caracteres peligrosos, espacios, etc., pero conserva la extensión
const sanitizeName = (value: unknown, fallbackExt = "") => {
  let name = String(value ?? "").trim();
  if (!name) name = `file-${Date.now()}`;

  // Separar nombre base y extensión
  let ext = "";
  const lastDot = name.lastIndexOf(".");
  if (lastDot !== -1 && lastDot > 0 && lastDot < name.length - 1) {
    ext = name.slice(lastDot);
    name = name.slice(0, lastDot);
  } else if (fallbackExt) {
    ext = fallbackExt.startsWith(".") ? fallbackExt : `.${fallbackExt}`;
  }

  // Limpiar solo el nombre base
  const cleanBase = name
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150);

  // Reconstruir nombre completo
  const finalName = cleanBase || `file-${Date.now()}`;
  return ext ? `${finalName}${ext}` : finalName;
};

const safeFolderName = (folderName: unknown) => {
  const cleaned = sanitizeName(folderName || "media", "");
  return cleaned || `media-${Date.now()}`;
};

const writeFileFromStream = async (stream: NodeJS.ReadableStream, destPath: string) =>
  new Promise<void>((resolve, reject) => {
    const writeStream = fs.createWriteStream(destPath);
    stream.pipe(writeStream);
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
    stream.on("error", reject);
  });

export const runtime = "nodejs";

export async function POST(req: Request) {
  const headers = Object.fromEntries(req.headers.entries());
  const contentType = String(headers["content-type"] || headers["Content-Type"] || "");
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { ok: false, error: "Content-Type must be multipart/form-data" },
      { status: 400 }
    );
  }

  const rawBody = req.body;
  if (!rawBody) {
    return NextResponse.json({ ok: false, error: "Request body is missing" }, { status: 400 });
  }

  const fields: Record<string, string> = {};
  const writePromises: Promise<void>[] = [];

  const nodeBody = Readable.fromWeb(rawBody as any);
  const BusboyModule = await import("busboy");
  const BusboyFactory = (BusboyModule && (BusboyModule.default || BusboyModule)) as any;
  const busboy = BusboyFactory({ headers });

  let folderName = `media-${Date.now()}`;
  let mediaType = "movie";
  const mediaDirBase = path.join(process.cwd(), "../movies-files");
  fs.mkdirSync(mediaDirBase, { recursive: true });
  let targetMediaDir = "";

  const createMediaDir = (rawFolderName: unknown) => {
    folderName = safeFolderName(rawFolderName);
    targetMediaDir = path.join(mediaDirBase, folderName);
    fs.mkdirSync(targetMediaDir, { recursive: true });
  };

  // Función mejorada para obtener el nombre original + extensión a partir del objeto file de busboy
  const getOriginalFilename = (
    filename: unknown,
    fieldname: string,
    mimeType?: string
  ): string => {
    let original = "";

    // Intentar extraer string directo o propiedad 'name' / 'filename'
    if (typeof filename === "string") {
      original = filename;
    } else if (filename && typeof filename === "object") {
      if ("name" in filename && typeof filename.name === "string") original = filename.name;
      else if ("filename" in filename && typeof filename.filename === "string")
        original = filename.filename;
    }

    if (original.trim()) {
      // Si el nombre ya tiene extensión, devolverlo tal cual
      return original;
    }

    // Fallback: generar nombre genérico con timestamp y extensión según MIME
    const ext = getExtensionFromMime(mimeType);
    return `${fieldname}-${Date.now()}${ext}`;
  };

  busboy.on("field", (fieldname: string, value: unknown) => {
    const stringValue = String(value ?? "");
    fields[fieldname] = stringValue;
    if (fieldname === "folderName") {
      createMediaDir(stringValue);
    } else if (fieldname === "mediaType") {
      mediaType = stringValue || "movie";
    }
  });

  // Añadimos los parámetros encoding y mimetype (busboy los envía)
  busboy.on(
    "file",
    (
      fieldname: string,
      file: NodeJS.ReadableStream,
      filename: unknown,
      encoding: string,
      mimetype: string
    ) => {
      // Obtener nombre original con extensión (si es posible)
      const rawFilename = getOriginalFilename(filename, fieldname, mimetype);
      const safeFilename = sanitizeName(rawFilename, getExtensionFromMime(mimetype));

      if (!targetMediaDir) {
        createMediaDir(fields.folderName || `media-${Date.now()}`);
      }

      // Archivo de información (info.json)
      if (fieldname === "infoFile") {
        // Si el archivo subido es un JSON, forzamos el nombre info.json
        const dest = path.join(
          targetMediaDir,
          rawFilename.toLowerCase().endsWith(".json") ? "info.json" : safeFilename
        );
        writePromises.push(writeFileFromStream(file, dest));
        return;
      }

      // Cover o poster
      if (fieldname === "cover") {
        const dest = path.join(targetMediaDir, safeFilename);
        writePromises.push(writeFileFromStream(file, dest));
        return;
      }

      // Video principal (para películas)
      if (fieldname === "video") {
        const dest = path.join(targetMediaDir, safeFilename);
        writePromises.push(writeFileFromStream(file, dest));
        return;
      }

      // Episodios de series (fieldname: season-1, season-2...)
      if (fieldname.startsWith("season-")) {
        const season = fieldname.split("-")[1] || "1";
        const seasonDir = path.join(targetMediaDir, `season${season}`);
        fs.mkdirSync(seasonDir, { recursive: true });
        const dest = path.join(seasonDir, safeFilename);
        writePromises.push(writeFileFromStream(file, dest));
        return;
      }

      // Cualquier otro archivo se guarda en la raíz de la carpeta
      const dest = path.join(targetMediaDir, safeFilename);
      writePromises.push(writeFileFromStream(file, dest));
    }
  );

  const busboyPromise = new Promise<void>((resolve, reject) => {
    busboy.on("finish", resolve);
    busboy.on("error", reject);
    nodeBody.pipe(busboy);
  });

  try {
    await busboyPromise;
    await Promise.all(writePromises);

    if (!targetMediaDir) {
      createMediaDir(fields.folderName || `media-${Date.now()}`);
    }

    const infoPath = path.join(targetMediaDir, "info.json");
    if (fields.info) {
      fs.writeFileSync(infoPath, fields.info, "utf-8");
    }

    if (!fs.existsSync(infoPath)) {
      const fallback = {
        title: folderName.replace(/[-_]/g, " ").trim(),
        type: mediaType === "series" ? "series" : "movie",
      };
      fs.writeFileSync(infoPath, JSON.stringify(fallback, null, 2), "utf-8");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Upload error", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}