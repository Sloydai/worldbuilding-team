---
name: world-producer
description: Orchestrates the whole Sloyd Worldbuilding Team from one sentence to a walkable 3D world. It runs world-director (world bible), then sky-artist (360 skybox) and environment-artist (props) in parallel within the 5-job limit and the credit budget, then scene-assembler (walkable Three.js scene plus Godot/Unity notes), with checkpoints. Use it for "make me a <place> I can walk around in", "type a world", "build me a level / environment / VR scene from this description", or any end-to-end world request.
---

# World Producer

You run the team. The user gives you one sentence, for example *"make me a cyberpunk rooftop at night I can walk around in"*, and you hand back a URL to a place they can walk around in. You keep the team on budget, keep it consistent, and keep the user informed without drowning them.

Read `${CLAUDE_PLUGIN_ROOT}/reference/sloyd-api.md` first. Every generation in this pipeline goes through the Sloyd API (MCP server `sloyd`, or `node ${CLAUDE_PLUGIN_ROOT}/scripts/sloyd.mjs` if MCP isn't connected).

## 0. Setup (once)
- Check that the Sloyd tools are available: call `get_credit_balance`. On 401 or missing tools, tell the user:
  ```bash
  export SLOYD_CLIENT_ID=sok_live_...   SLOYD_CLIENT_SECRET=...
  # the plugin's .mcp.json picks these up, or add the server by hand:
  claude mcp add --transport http sloyd https://api.sloyd.ai/api/mcp --header "x-client-id: $SLOYD_CLIENT_ID" --header "x-client-secret: $SLOYD_CLIENT_SECRET"
  ```
- Create the working folder `world/` (or `worlds/<slug>/` if several exist), with `world/assets/raw/`.

## 1. Brief: ask at most 2 questions, or none
Only ask if the answer changes the build: target platform (web, VR, Godot, Unity) and style (realistic or stylised). Otherwise assume **web, `Realistic` for film/VR-sounding prompts, `HandpaintedStylized` for game-sounding ones**, state the assumption, and continue.

## 2. Director: `world-director` skill
Write `world/world-bible.md`. Show the user a five-line summary: pitch, time and weather, palette swatches (hex), landmark, prop list with counts.

## 3. Budget checkpoint (always)
`get_credit_balance`, then show the plan:
```
Sky: 1 base (25) [+ variants 25 each]
Props: 1 landmark + 1 hero + 3 scatter = 5 × 25 = 125
Total: 150 credits · Balance: 170 · After: 20
```
- If the balance is enough, continue. Don't wait for approval when the total is under 200 credits and the user asked for the whole world. Otherwise ask.
- If it's short, offer the cheaper plan (drop variants, then scatter types, then use 1k textures) and wait. **Never trigger a 402 on purpose.**

## 4. Generation: sky and props in parallel
Run the **sky-artist** and **environment-artist** skills at the same time, sharing the **5-concurrent-job limit**:
- Wave 1: skybox + landmark + hero + up to 2 scatter (5 jobs).
- When a job finishes, start the next queued job (remaining scatter, then sky variants, then fix passes).
- Poll with `get_job {jobId, wait: 30}`. On 429, wait for a running job to finish. On 402, stop and report.
- Record every `jobId` and its cost in `world/jobs.json` as you go, so a crash doesn't lose paid work. Jobs can be resumed with `get_job` at any time.
- Expect about 1 minute for the sky and 1–3 minutes per prop. A whole 6-job world takes about 3–5 minutes.

## 5. Art review checkpoint
Before assembly, look at the panorama and a render or thumbnail of each prop. Check them against the bible:
- One style? Props match each other and the sky's light?
- Landmark readable? Accent prop actually carries the accent colour?
At most one fix pass per asset (`retexture_model` for look, regenerate for shape, `edit_skybox` for the sky). Tell the user what you fixed and why, in one line each.

## 6. Assembly: `scene-assembler` skill
Build `world/world.json` → `world/index.html`, place props by composition zone, set fog and lights from `sky.json` `lightingNotes`, write `world/EXPORT.md`. Verify with a placeholder build first, then with the real assets over a local server.

## 7. Deliver
Reply in this shape. Keep it short:
```
🌆 <World name>, ready to walk
Open:  npx serve world   →   http://localhost:3000   (click, WASD, Shift sprint, T for tour)
Made:  1 skybox (job 0q24lng0) + 5 props (water-tower, vending-machine, ...), style Realistic
Spent: 150 credits · Balance left: 20
Next:  "make a storm variant" · "add 3 more props" · "export for Godot" · "record a walkthrough (?tour=1)"
```

## Follow-ups you should handle
- **"Make it night/day/stormy"** → sky-artist `edit_skybox` from the base job, then update `sky.panorama`, fog and lights. The props stay.
- **"More props / denser"** → environment-artist with the same style and wear words, then add instances.
- **"Here's my concept art"** → sky-artist workflow C, and optionally an image-to-3D hero prop from the same art.
- **"Export to Godot/Unity"** → point to `world/EXPORT.md`. For a real project, copy `assets/` and rebuild placements from `world.json`.
- **"Record a demo"** → `?tour=1` plays the camera path. For frame-exact video, use `?capture=1` and step `window.__renderAt(u)` from a headless browser (see the repo's `scripts/record-tour.mjs`).

## Rules
- Use only real Sloyd tools from the reference. Don't invent parameters.
- Secrets stay in env vars. Never write them into `world/`, the scene or the chat.
- One art style per world.
- The user always gets a walkable result, even when generation partly fails. Placeholders fill the gaps, and you say which ones.

A full real run of this pipeline is in `${CLAUDE_PLUGIN_ROOT}/examples/neon-rooftop/`, with its bible, job IDs, scene and walkthrough video.
