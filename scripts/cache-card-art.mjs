import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js";

const catalogPath = path.resolve("app/data/smashup-catalog.json");
const libraryRoot = path.resolve("public/card-art/library");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const jobs = [];

for (const faction of catalog.factions) {
  for (const card of faction.cards) {
    if (!/^https?:\/\//.test(card.imageUrl || "")) continue;
    const relativePath = path.posix.join("card-art/library", faction.slug, `${card.id}.webp`);
    jobs.push({ card, faction, relativePath, outputPath: path.resolve("public", relativePath) });
  }
}

let completed = 0;
let downloaded = 0;
let cached = 0;
const failures = [];
let cursor = 0;

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function fetchImage(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35_000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "user-agent": "SmashUpCardArchive/1.0 image-library-builder" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length) throw new Error("empty response");
      return bytes;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 900));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

async function processJob(job) {
  await mkdir(path.dirname(job.outputPath), { recursive: true });
  if (await exists(job.outputPath)) {
    cached += 1;
  } else {
    const source = await fetchImage(job.card.imageUrl);
    await sharp(source)
      .rotate()
      .resize({ width: 760, withoutEnlargement: true })
      .webp({ quality: 72, effort: 4, smartSubsample: true })
      .toFile(job.outputPath);
    downloaded += 1;
  }

  job.card.imageUrl = job.relativePath;
  completed += 1;
  if (completed % 25 === 0 || completed === jobs.length) {
    console.log(`[card-art] ${completed}/${jobs.length} ready (new ${downloaded}, reused ${cached})`);
  }
}

async function worker() {
  while (true) {
    const job = jobs[cursor];
    cursor += 1;
    if (!job) return;
    try {
      await processJob(job);
    } catch (error) {
      failures.push({ id: job.card.id, url: job.card.imageUrl, reason: error instanceof Error ? error.message : String(error) });
      console.warn(`[card-art] failed ${job.card.id}: ${failures.at(-1).reason}`);
    }
  }
}

console.log(`[card-art] preparing local library for ${jobs.length} remote card images`);
await Promise.all(Array.from({ length: 6 }, worker));
await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + "\n", "utf8");

console.log(`[card-art] complete: ${completed}/${jobs.length}; new ${downloaded}; reused ${cached}; failures ${failures.length}`);
if (failures.length) {
  console.warn(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
}
