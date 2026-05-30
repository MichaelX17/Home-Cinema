const http = require("http");
const fs = require("fs");
const path = require("path");
const Busboy = require("busboy");

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const HOST = process.env.HOST || "0.0.0.0";
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : ["*"];

const sanitizeName = (name) =>
  name
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 150) || `file-${Date.now()}`;

const createUploadDir = (folderName) => {
  const safeName = sanitizeName(folderName || "media");
  const targetDir = path.join(process.cwd(), "public", "movies", safeName);
  fs.mkdirSync(targetDir, { recursive: true });
  return { safeName, targetDir };
};

const sendJson = (res, status, payload) => {
  if (!res.headersSent) {
    res.writeHead(status, { "Content-Type": "application/json" });
  }
  res.end(JSON.stringify(payload));
};

const isOriginAllowed = (origin) => {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes("*")) return true;
  return ALLOWED_ORIGINS.includes(origin);
};

const setCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (ALLOWED_ORIGINS.includes("*")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Credentials", "false");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
};

const server = http.createServer((req, res) => {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    sendJson(res, 204, { ok: true });
    return;
  }

  const url = req.url ? req.url.split("?")[0] : "";
  if (req.method !== "POST" || url !== "/api/upload") {
    sendJson(res, 404, { ok: false, error: "Not found" });
    return;
  }

  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("multipart/form-data")) {
    sendJson(res, 400, { ok: false, error: "Content-Type must be multipart/form-data" });
    return;
  }

  const fields = {};
  const writePromises = [];
  let folderName = `media-${Date.now()}`;
  let mediaType = "movie";
  let targetDir = "";

  const ensureMediaDir = (rawFolderName) => {
    const result = createUploadDir(rawFolderName);
    folderName = result.safeName;
    targetDir = result.targetDir;
    return targetDir;
  };

  const busboy = Busboy({ headers: req.headers });

  busboy.on("field", (fieldname, value) => {
    fields[fieldname] = value;
    if (fieldname === "folderName") {
      ensureMediaDir(value);
    } else if (fieldname === "mediaType") {
      mediaType = value || "movie";
    }
  });

  const writeStream = (stream, destPath) =>
    new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(destPath);
      stream.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
      stream.on("error", reject);
    });

  busboy.on("file", (fieldname, file, filename) => {
    const rawFilename = filename || `${fieldname}-${Date.now()}`;
    const safeFilename = sanitizeName(rawFilename);

    if (!targetDir) {
      ensureMediaDir(fields.folderName || `media-${Date.now()}`);
    }

    let destPath;
    if (fieldname === "infoFile") {
      destPath = path.join(
        targetDir,
        rawFilename.toLowerCase().endsWith(".json") ? "info.json" : safeFilename
      );
    } else if (fieldname === "cover") {
      destPath = path.join(targetDir, safeFilename);
    } else if (fieldname === "video") {
      destPath = path.join(targetDir, safeFilename);
    } else if (fieldname.startsWith("season-")) {
      const season = fieldname.split("-")[1] || "1";
      const seasonDir = path.join(targetDir, `season${season}`);
      fs.mkdirSync(seasonDir, { recursive: true });
      destPath = path.join(seasonDir, safeFilename);
    } else {
      destPath = path.join(targetDir, safeFilename);
    }

    writePromises.push(writeStream(file, destPath));
  });

  busboy.on("error", (error) => {
    console.error("Upload server busboy error:", error);
    if (!res.headersSent) {
      sendJson(res, 500, { ok: false, error: String(error) });
    }
  });

  busboy.on("finish", async () => {
    try {
      await Promise.all(writePromises);

      if (!targetDir) {
        ensureMediaDir(fields.folderName || `media-${Date.now()}`);
      }

      const infoPath = path.join(targetDir, "info.json");
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

      sendJson(res, 200, { ok: true });
    } catch (error) {
      console.error("Upload server write error:", error);
      sendJson(res, 500, { ok: false, error: String(error) });
    }
  });

  req.pipe(busboy);
});

server.listen(PORT, HOST, () => {
  console.log(`Upload server listening at http://${HOST}:${PORT}/api/upload`);
  console.log(`Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
});
