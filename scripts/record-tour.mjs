#!/usr/bin/env node
// Frame-exact walkthrough recording of a built scene (for demo videos).
//   npm i -D playwright ffmpeg-static && npx playwright install chromium
//   node scripts/record-tour.mjs <sceneDir> [page=index.html] [out=walkthrough.mp4] [w=1280] [h=720] [fps=30]
// Opens the scene with ?capture=1, steps window.__renderAt(u) along world.json "tour" for every frame,
// reads the canvas directly (works with software WebGL in CI), overlays the HUD (captured once as a
// transparent PNG) and encodes H.264. In software GL it takes roughly 0.5 s per frame at 720p.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import ffmpeg from "ffmpeg-static";

const [dirArg, page = "index.html", out = "walkthrough.mp4", w = "1280", h = "720", fps = "30"] = process.argv.slice(2);
if (!dirArg) { console.error("Usage: node scripts/record-tour.mjs <sceneDir> [page] [out.mp4] [w] [h] [fps]"); process.exit(1); }
const dir = resolve(dirArg);
const MIME = { ".html": "text/html", ".glb": "model/gltf-binary", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png" };
const srv = createServer(async (q, r) => {
  try {
    const p = join(dir, decodeURIComponent(q.url.split("?")[0]));
    if (!p.startsWith(dir)) throw new Error("outside");
    const b = await readFile(p); r.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" }); r.end(b);
  } catch { r.writeHead(404); r.end(); }
}).listen(0, "127.0.0.1");

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await browser.newPage({ viewport: { width: +w, height: +h } });
await p.goto(`http://127.0.0.1:${srv.address().port}/${page}?capture=1`);
await p.waitForFunction(() => window.__worldReady, null, { timeout: 120000 });

const tmp = join(tmpdir(), `tour_${Date.now()}`);
await mkdir(tmp, { recursive: true });
await p.evaluate(() => {
  document.getElementById("start").style.display = "none"; document.getElementById("status").style.display = "none";
  document.querySelector("canvas").style.visibility = "hidden";
  document.body.style.background = document.documentElement.style.background = "transparent";
});
await p.waitForTimeout(1500); // web fonts
await p.screenshot({ path: join(tmp, "hud.png"), omitBackground: true });
await p.evaluate(() => { document.querySelector("canvas").style.visibility = "visible"; });

const n = Math.round((await p.evaluate(() => window.__tour.seconds())) * +fps);
const t0 = Date.now();
for (let i = 0; i < n; i++) {
  const data = await p.evaluate(([u, dt]) => { window.__renderAt(u, dt); return document.querySelector("canvas").toDataURL("image/jpeg", 0.93); }, [i / (n - 1), 1 / +fps]);
  await writeFile(join(tmp, `${String(i).padStart(5, "0")}.jpg`), Buffer.from(data.split(",")[1], "base64"));
  if (i % 120 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close(); srv.close();
execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-framerate", fps, "-i", join(tmp, "%05d.jpg"), "-i", join(tmp, "hud.png"),
  "-filter_complex", `[0:v]scale=${w}:${h}[v];[v][1:v]overlay=0:0,format=yuv420p`,
  "-c:v", "libx264", "-crf", "19", "-preset", "medium", "-movflags", "+faststart", out], { stdio: "inherit" });
await rm(tmp, { recursive: true });
console.log("wrote", out);
