#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { polishAboutContent } from '../lib/polish-about.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function resolveTargetPath() {
  const provided = process.argv[2];
  if (provided) {
    return path.resolve(process.cwd(), provided);
  }
  return path.resolve(repoRoot, 'about.md');
}

async function main() {
  const targetPath = resolveTargetPath();

  let original;
  try {
    original = await readFile(targetPath, 'utf8');
  } catch (error) {
    console.error(`Could not read about file at ${targetPath}:`, error instanceof Error ? error.message : error);
    process.exitCode = 1;
    return;
  }

  const polished = polishAboutContent(original);

  if (polished === original) {
    console.log('about.md is already polished.');
    return;
  }

  try {
    await writeFile(targetPath, polished, 'utf8');
  } catch (error) {
    console.error(`Failed to write polished content to ${targetPath}:`, error instanceof Error ? error.message : error);
    process.exitCode = 1;
    return;
  }

  const relativePath = path.relative(process.cwd(), targetPath) || 'about.md';
  console.log(`Polished ${relativePath}`);
}

main().catch((error) => {
  console.error('Unexpected error while polishing about.md:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
