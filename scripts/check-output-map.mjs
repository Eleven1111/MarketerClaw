import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Parse mc-review reverse map: lines like "copy.md → mc-copy"
function parseReverseMap() {
  const md = readFileSync(join(ROOT, "skills/mc-review/SKILL.md"), "utf-8");
  const map = {};
  for (const m of md.matchAll(/^([^\n→|]+?)\s*→\s*(mc-[\w-]+)\s*$/gm)) {
    map[m[1].trim()] = m[2].trim();
  }
  return map;
}

// Parse mc-cmo routing table: rows "| desc | mc-skill | files |"
// Build skill → 主产出文件 column string.
function parseDispatchFiles() {
  const md = readFileSync(join(ROOT, "skills/mc-cmo/SKILL.md"), "utf-8");
  const skillFiles = {};
  for (const line of md.split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 4) continue;
    const skill = cells[2];
    const files = cells[3];
    if (!/^mc-[\w-]+$/.test(skill)) continue;
    skillFiles[skill] = files;
  }
  return skillFiles;
}

export function checkOutputMap() {
  const reverse = parseReverseMap();
  const dispatch = parseDispatchFiles();
  const conflicts = [];
  for (const [file, skill] of Object.entries(reverse)) {
    if (!dispatch[skill]) {
      conflicts.push(`reverse-map skill "${skill}" (for ${file}) absent from dispatch routing table`);
      continue;
    }
    // Compare on the leading filename token, stripping {placeholder} and subpaths.
    const fileBase = file.split("/")[0].replace(/\{[^}]*\}.*/, "");
    const declared = dispatch[skill];
    if (!declared.includes(fileBase)) {
      conflicts.push(`file "${file}" maps to ${skill} in reverse-map, but dispatch lists "${declared}" for ${skill}`);
    }
  }
  return { ok: conflicts.length === 0, conflicts, reverse, dispatch };
}

// Allow `node scripts/check-output-map.mjs` for ad-hoc inspection.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { ok, conflicts } = checkOutputMap();
  if (ok) {
    process.stdout.write("✅ reverse-map consistent with cmo routing table\n");
  } else {
    process.stderr.write("❌ drift detected:\n" + conflicts.join("\n") + "\n");
    process.exit(1);
  }
}
