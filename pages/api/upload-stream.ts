import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
// require busboy at runtime; ensure you run `npm install`
const Busboy = require('busboy');

const sanitize = (name: string) =>
  name
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150) || `file-${Date.now()}`;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const bb = Busboy({ headers: req.headers as any });
  const folderNameRaw = (req.headers['x-folder-name'] as string) || `media-${Date.now()}`;
  const folderName = sanitize(folderNameRaw);
  const mediaDir = path.join(process.cwd(), 'public', 'movies', folderName);
  fs.mkdirSync(mediaDir, { recursive: true });

  const fields: Record<string, string> = {};
  const written: string[] = [];
  let errorOccurred: any = null;

  bb.on('field', (name: any, val: any) => {
    fields[name] = val;
  });

  bb.on('file', (name: any, file: any, info: any) => {
    const { filename } = info || {};
    const safeName = sanitize(filename || `${name}-${Date.now()}`);

    if (name === 'infoFile') {
      const dest = path.join(mediaDir, filename?.toLowerCase().endsWith('.json') ? 'info.json' : safeName);
      const ws = fs.createWriteStream(dest);
      file.pipe(ws);
      ws.on('finish', () => written.push(dest));
      ws.on('error', (err) => { errorOccurred = err; file.resume(); });
      return;
    }

    if (name === 'cover' || name === 'video') {
      const dest = path.join(mediaDir, safeName);
      const ws = fs.createWriteStream(dest);
      file.pipe(ws);
      ws.on('finish', () => written.push(dest));
      ws.on('error', (err) => { errorOccurred = err; file.resume(); });
      return;
    }

    if (name.startsWith('season-')) {
      const parts = name.split('-');
      const season = parts[1] || '1';
      const seasonDir = path.join(mediaDir, `season${season}`);
      fs.mkdirSync(seasonDir, { recursive: true });
      const dest = path.join(seasonDir, safeName);
      const ws = fs.createWriteStream(dest);
      file.pipe(ws);
      ws.on('finish', () => written.push(dest));
      ws.on('error', (err) => { errorOccurred = err; file.resume(); });
      return;
    }

    // fallback
    const dest = path.join(mediaDir, safeName);
    const ws = fs.createWriteStream(dest);
    file.pipe(ws);
    ws.on('finish', () => written.push(dest));
    ws.on('error', (err) => { errorOccurred = err; file.resume(); });
  });

  bb.on('close', () => {
    if (errorOccurred) {
      console.error('Upload error', errorOccurred);
      return res.status(500).json({ ok: false, error: String(errorOccurred) });
    }

    // if info text provided in fields
    if (fields.info) {
      try {
        fs.writeFileSync(path.join(mediaDir, 'info.json'), fields.info, 'utf-8');
      } catch (e) {
        console.error('Failed to write info field', e);
      }
    }

    const infoPath = path.join(mediaDir, 'info.json');
    if (!fs.existsSync(infoPath)) {
      const fallback = {
        title: folderName.replace(/[-_]/g, ' ').trim(),
        type: fields.mediaType === 'series' ? 'series' : 'movie',
      };
      fs.writeFileSync(infoPath, JSON.stringify(fallback, null, 2), 'utf-8');
    }

    return res.status(200).json({ ok: true });
  });

  req.pipe(bb);
}
