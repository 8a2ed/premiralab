import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Optimizes an image file (JPEG, PNG, WebP) in-place.
 * Compresses it and converts to WebP to save massive amounts of disk space.
 * 
 * @param filePath The absolute path to the uploaded file.
 * @returns The new filename if compressed, or null if it was skipped (not an image).
 */
export async function optimizeImage(filePath: string): Promise<{ newFilename: string; size: number } | null> {
  const ext = path.extname(filePath).toLowerCase();
  
  // Only process standard images. Ignore SVGs, PDFs, ZIPs, etc.
  if (!['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'].includes(ext)) {
    return null;
  }

  try {
    const dir = path.dirname(filePath);
    const basename = path.basename(filePath, ext);
    const newFilename = `${basename}.webp`;
    const newPath = path.join(dir, newFilename);

    // If it's already a webp, we still might want to compress it, but
    // let's just make a temp file and overwrite.
    const tempPath = path.join(dir, `${basename}_temp.webp`);

    await sharp(filePath)
      .rotate() // auto-orient based on EXIF
      .resize({
        width: 1920,
        height: 1920,
        fit: 'inside', // Don't enlarge, just shrink if it's huge
        withoutEnlargement: true,
      })
      .webp({ quality: 75, effort: 4 }) // WebP compression
      .toFile(tempPath);

    // Replace the original file with the new WebP
    await fs.unlink(filePath).catch(() => {});
    await fs.rename(tempPath, newPath);
    
    const stats = await fs.stat(newPath);

    return { newFilename, size: stats.size };
  } catch (err) {
    console.error('[Image Optimization Error]', err);
    // If it fails, keep the original file gracefully
    return null;
  }
}
