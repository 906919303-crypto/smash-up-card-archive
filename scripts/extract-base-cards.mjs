import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const catalogPath = path.resolve("app/data/smashup-catalog.json");
const outputPath = path.resolve("app/data/smashup-bases.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const factions = catalog.factions.filter((faction) => faction.sourceUrl.includes("smashup-rulebook.alderac.com"));

function rawUrl(sourceUrl) {
  const source = new URL(sourceUrl);
  const title = decodeURIComponent(source.pathname.split("/").pop() ?? "");
  return `https://smashup-rulebook.alderac.com/w/index.php?title=${encodeURIComponent(title)}&action=raw`;
}

function clean(value) {
  return value
    .replace(/\[\[File:[^\]]+\]\]/gi, "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[https?:\/\/[^\s\]]+\s+([^\]]+)\]/g, "$1")
    .replace(/'{2,}/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\u200B/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function rulebookImageUrl(fileName) {
  const normalized = fileName.replace(/ /g, "_");
  const hash = createHash("md5").update(normalized).digest("hex");
  const encoded = encodeURIComponent(normalized).replace(/%2F/gi, "/");
  return `https://smashup-rulebook.alderac.com/w/img_auth.php/thumb/${hash[0]}/${hash.slice(0, 2)}/${encoded}/300px-${encoded}`;
}

function parseBases(raw, faction) {
  const normalizedRaw = raw.replace(/\r/g, "");
  const section = normalizedRaw.match(/===\s*Cards\s*-\s*Bases\s*===([\s\S]*?)(?=\n===\s*(?!\=)|$)/i)?.[1];
  if (!section) return [];

  const headings = [...section.matchAll(/======\s*(\d+)\s*x\s*(.*?)\s*======/gi)];
  return headings.flatMap((heading, index) => {
    const entry = section.slice((heading.index ?? 0) + heading[0].length, headings[index + 1]?.index ?? section.length);
    const name = clean(heading[2]);
    const fileName = entry.match(/\[\[File:([^\]|]+)[^\]]*\]\]/i)?.[1]?.trim();
    const effect = clean(entry.split(/\n\s*(?:Errata\??|Clarifications):/i)[0]);
    const stats = effect.match(/Breakpoint\s+(\d+)\s*-\s*VPs?:\s*([\d\s]+)\s*-\s*(.*)$/i);
    if (!name || !stats) return [];
    return [{
      id: `base-${faction.slug}-${index + 1}`,
      name,
      sourceFaction: faction.name,
      sourceFactionZh: faction.nameZh,
      set: faction.set,
      setZh: faction.setZh,
      breakpoint: Number(stats[1]),
      vp: stats[2].trim().split(/\s+/).map(Number).filter(Number.isFinite),
      text: stats[3].trim(),
      errata: clean(entry.match(/Errata\??:\s*([^\n]+)/i)?.[1] ?? "Not stated"),
      clarifications: [],
      imageUrl: fileName ? rulebookImageUrl(fileName) : undefined,
      imageKind: "card",
      imageSource: "AEG Official Rulebook Wiki",
      imageAlt: `${name} · Smash Up`,
      sourceUrl: faction.sourceUrl,
      sourceProvider: "官方规则维基",
    }];
  });
}

const results = [];
const failures = [];
let cursor = 0;

async function worker() {
  while (cursor < factions.length) {
    const faction = factions[cursor++];
    try {
      const response = await fetch(rawUrl(faction.sourceUrl), {
        headers: { "user-agent": "SmashUpCardArchive/1.0 base-card-catalog-builder" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bases = parseBases(await response.text(), faction);
      if (!bases.length) throw new Error("no base cards parsed");
      results.push(...bases);
    } catch (error) {
      failures.push({ faction: faction.name, reason: error instanceof Error ? error.message : String(error) });
    }
  }
}

await Promise.all(Array.from({ length: 8 }, worker));
results.sort((left, right) => left.set.localeCompare(right.set) || left.sourceFaction.localeCompare(right.sourceFaction) || left.name.localeCompare(right.name));

await writeFile(outputPath, JSON.stringify({
  source: { name: "AEG Official Rulebook Wiki", url: "https://smashup-rulebook.alderac.com/", retrievedAt: new Date().toISOString() },
  bases: results,
  extraction: { sourceFactions: factions.length, baseCards: results.length, failures },
}, null, 2) + "\n", "utf8");

console.log(`[bases] ${results.length} cards from ${factions.length - failures.length}/${factions.length} factions`);
if (failures.length) console.warn(JSON.stringify(failures, null, 2));
