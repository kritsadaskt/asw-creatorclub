import { readdir, stat } from 'fs/promises';
import path from 'path';

const MANUAL_FILENAME_PREFIX = 'AssetWise_CreatorClub_Manual';

/**
 * Picks the newest `public/AssetWise_CreatorClub_Manual*.pdf` by mtime so ops can
 * drop a new version without changing code.
 */
export async function findLatestCreatorClubManualPdf(): Promise<{
  absolutePath: string;
  filename: string;
} | null> {
  const publicDir = path.join(process.cwd(), 'public');
  let names: string[];
  try {
    names = await readdir(publicDir);
  } catch {
    return null;
  }

  const candidates = names.filter(
    (n) => n.startsWith(MANUAL_FILENAME_PREFIX) && n.toLowerCase().endsWith('.pdf'),
  );

  let best: { absolutePath: string; filename: string; mtime: number } | null = null;

  for (const filename of candidates) {
    const absolutePath = path.join(publicDir, filename);
    try {
      const s = await stat(absolutePath);
      if (!s.isFile()) continue;
      if (!best || s.mtimeMs > best.mtime) {
        best = { absolutePath, filename, mtime: s.mtimeMs };
      }
    } catch {
      continue;
    }
  }

  if (!best) return null;
  return { absolutePath: best.absolutePath, filename: best.filename };
}
