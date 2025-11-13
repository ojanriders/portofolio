import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const MAX_BYTES = 200 * 1024;
const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'out',
  '.next',
  '.vercel',
  'coverage',
  '.turbo'
]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)}KB`;
}

async function ensureWebp(sourceBuffer, outputPath, hasAlpha) {
  const webpBuffer = await sharp(sourceBuffer)
    .rotate()
    .webp({ quality: hasAlpha ? 85 : 75, effort: 5 })
    .toBuffer();

  let existing;
  try {
    existing = await readFile(outputPath);
  } catch {
    existing = null;
  }

  if (!existing || !existing.equals(webpBuffer)) {
    await writeFile(outputPath, webpBuffer);
    return true;
  }

  return false;
}

async function compressJpeg(buffer) {
  let quality = 80;
  let bestBuffer = buffer;

  while (quality >= 40) {
    const candidate = await sharp(buffer)
      .rotate()
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();

    bestBuffer = candidate;

    if (candidate.byteLength <= MAX_BYTES || quality === 40) {
      break;
    }

    quality -= 10;
  }

  return bestBuffer;
}

async function compressPng(buffer) {
  let quality = 90;
  let bestBuffer = buffer;

  while (quality >= 30) {
    const candidate = await sharp(buffer)
      .png({ quality, palette: true, compressionLevel: 9, effort: 10 })
      .toBuffer();

    bestBuffer = candidate;

    if (candidate.byteLength <= MAX_BYTES || quality === 30) {
      break;
    }

    quality -= 10;
  }

  return bestBuffer;
}

async function main() {
  const root = process.cwd();
  const images = await walk(root);

  if (images.length === 0) {
    console.log('No PNG or JPEG images found.');
    return;
  }

  const oversize = [];
  const summary = [];

  for (const filePath of images) {
    const relative = path.relative(root, filePath);
    const originalStat = await stat(filePath);
    let currentBuffer = await readFile(filePath);
    let metadata = await sharp(currentBuffer).metadata();
    let optimized = false;

    if (originalStat.size > MAX_BYTES) {
      if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
        const compressed = await compressJpeg(currentBuffer);
        if (compressed.byteLength < currentBuffer.byteLength) {
          await writeFile(filePath, compressed);
          currentBuffer = compressed;
          optimized = true;
          metadata = await sharp(currentBuffer).metadata();
        }
      } else if (metadata.format === 'png') {
        const compressed = await compressPng(currentBuffer);
        if (compressed.byteLength < currentBuffer.byteLength) {
          await writeFile(filePath, compressed);
          currentBuffer = compressed;
          optimized = true;
          metadata = await sharp(currentBuffer).metadata();
        }
      }
    }

    const webpPath = path.join(
      path.dirname(filePath),
      `${path.basename(filePath, path.extname(filePath))}.webp`
    );
    const webpCreated = await ensureWebp(currentBuffer, webpPath, Boolean(metadata.hasAlpha));

    const finalStat = await stat(filePath);
    if (finalStat.size > MAX_BYTES) {
      oversize.push({ file: relative, size: finalStat.size });
    }

    summary.push({
      file: relative,
      original: originalStat.size,
      final: finalStat.size,
      optimized,
      webpCreated
    });
  }

  if (summary.length) {
    console.log('Image optimization summary:');
    for (const item of summary) {
      const change = item.final - item.original;
      const indicator = change < 0 ? '-' : change > 0 ? '+' : '±';
      console.log(
        ` • ${item.file}: ${formatBytes(item.original)} → ${formatBytes(item.final)} (${indicator}${Math.abs(change / 1024).toFixed(1)}KB)` +
          `${item.optimized ? ' [optimized]' : ''}` +
          `${item.webpCreated ? ' [webp updated]' : ''}`
      );
    }
  }

  if (oversize.length > 0) {
    console.error('\nThe following images are still larger than 200KB after optimization:');
    for (const item of oversize) {
      console.error(` - ${item.file} (${formatBytes(item.size)})`);
    }
    console.error('Please consider resizing or compressing them further.');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Image optimization failed:', error);
  process.exitCode = 1;
});
