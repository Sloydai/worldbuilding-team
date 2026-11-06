#!/usr/bin/env node
// Build a walkable single-file scene from templates/scene.html and a world.json.
//   node scripts/build-scene.mjs <world.json> <out.html>
// The template keeps all logic. world.json only holds data (sky, fog, lights, ground, player, props, tour).
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [worldPath, outPath] = process.argv.slice(2);
if (!worldPath || !outPath) {
  console.error("Usage: node scripts/build-scene.mjs <world.json> <out.html>");
  process.exit(1);
}
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const template = await readFile(join(root, "templates/scene.html"), "utf8");
const world = JSON.parse(await readFile(worldPath, "utf8"));

for (const k of ["title", "sky", "ground", "player", "props"]) {
  if (!(k in world)) throw new Error(`world.json is missing "${k}"`);
}
const json = JSON.stringify(world, null, 2).replace(/</g, "\\u003c");
const re = /(<script type="application\/json" id="world">)[\s\S]*?(<\/script>)/;
if (!re.test(template)) throw new Error("World block not found in template");
await writeFile(outPath, template.replace(re, `$1\n${json}\n$2`));
console.log(`Wrote ${outPath} (${world.props.length} prop types, ${world.props.reduce((n, p) => n + p.instances.length, 0)} instances)`);
