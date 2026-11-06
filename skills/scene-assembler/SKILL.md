---
name: scene-assembler
description: Assembles a Sloyd skybox and Sloyd props into a walkable single-file Three.js scene (index.html, no build step). The panorama becomes both background and environment map, props are scaled to real-world heights and placed by composition zone with colliders, and the file has WASD and pointer-lock controls, fog, accent lights and a recordable camera tour. Also writes Godot 4 and Unity export notes. Use it for "put it together / make it walkable / build the scene / export to Godot or Unity", or as step 4 of building a world.
---

# Scene Assembler

You are the level designer. You take the sky and the props and make **a place you can walk around in**, in one HTML file that opens in any browser.

## Inputs
- `world/world-bible.md`: composition (spawn, look direction, layers), playable space, palette, player scale.
- `world/sky.json`: panorama path or URL and `lightingNotes`.
- `world/assets.json`: props with `height`, `count`, `zone` and `accentLight`.
- Missing assets are fine. The template turns any missing or failed URL into a placeholder box at the correct size, and a missing sky into a gradient, so you can lay out the scene before generation finishes.

## Build

The template `${CLAUDE_PLUGIN_ROOT}/templates/scene.html` holds all the code. Put everything about the world in a `world.json` and inject it:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/build-scene.mjs world/world.json world/index.html
```

`world.json` schema (see `${CLAUDE_PLUGIN_ROOT}/examples/neon-rooftop/world.json` for the real one):

| Key | What to put in it |
|---|---|
| `title`, `subtitle` | World name, and the original prompt as subtitle |
| `sky.panorama` | `assets/sky-panorama.webp` (local) or the Sloyd `panoramaUrl`. Leave it empty for a placeholder |
| `sky.environmentIntensity` | 0.6–1.0. How strongly the sky lights the props |
| `sky.rotationDeg` | Rotate the panorama so its most interesting part lines up with the spawn view |
| `fog.color`, `fog.density` | Colour = the sky's horizon colour from `lightingNotes`. Density: 0.008 (clear) to 0.03 (thick haze) |
| `lights.hemisphere`, `lights.key` | Hemisphere = sky and ground colours from `lightingNotes`. Key = the bible's key-light colour and direction |
| `ground` | `type` (`rooftop` adds a building beneath), `size [w,d]` in m, `color`, `wetness` 0–1 (procedural glossy puddles that reflect the sky), `parapetHeight` (edge wall, 0 = none), `edgeGlow` (neon strip colour, optional) |
| `weather.rain` | `true` for rain streaks |
| `player` | `eyeHeight` 1.7, `walkSpeed` 3.2, `sprintSpeed` 6.5, `spawn [x,z]`, `lookAt [x,z]` |
| `props[]` | `{id, url, height, color, light?, instances:[{x,z,rotY,scale?}]}`. `height` in metres comes from assets.json. `color` is the placeholder colour |
| `tour` | `{seconds, points: [[x,z,lookX,lookZ], ...]}`, the camera path for demo recordings |

Coordinates: metres, origin at the centre of the playable space, −Z is "north" (forward from a south spawn), Y is up.

## Placement: the level-design part

Don't scatter evenly. Use the bible's layers.

1. **Spawn** at one edge looking across the space, so the first frame shows foreground, midground and landmark at once.
2. **Landmark** in the background, off-centre on a third of the spawn view (e.g. `x = +0.25·w, z = −0.3·d`). Give it its accent light high up (`offset [0, 0.6·height, …]`) so the silhouette pops against the sky.
3. **Focal (warm) prop** in the midground, about 40% of the way from spawn to landmark and offset to the *other* side, so the path bends. Put its light at chest height (`offset [0, 1.2, 1.0]`), facing the spawn. Doubling it (two vending machines, two lanterns) makes a stronger focal point for no extra credits.
4. **Scatter in clusters, never in a grid.** Line props up against edges and walls (HVAC units along a parapet, crates in corners, rocks at cliff feet). Use clusters of 2–3 with slight rotation differences (±10–30°), and leave **open walking lanes at least 2 m wide**. Fill 15–25% of the floor. Leave the rest open.
5. **Silhouettes on the skyline:** put one or two tall scatter props (dishes, trees, lamp posts) near the edge, where they cut into the sky.
6. **Rotation:** front faces toward the walking lane or the spawn. Sloyd models face +Z by default, so `rotY` 180 faces north.
7. **Check the tour:** the camera path must stay at least 1 m from every prop centre. Start and end at the spawn so the video loops.

## Verify (required)
1. **Placeholder check:** build with empty URLs and open `index.html` straight from disk (file:// works). The layout should read correctly with boxes.
2. **Real assets:** serve the folder (`npx serve world` or `python3 -m http.server -d world 8000`). Browsers block file:// fetches of GLB and WebP. Open it, click, and walk the whole space. Check that no prop floats or sinks (the template puts each model's base on y=0), the scale is right (doors 2 m, you're 1.7 m), colliders stop you, and nothing important is out of reach.
3. URL flags: `?debug=1` shows collider rings. `?tour=1` plays the camera tour. `?hud=0` hides the overlay. `?capture=1` turns off the render loop for frame-exact recording (call `window.__renderAt(u)`, with u from 0 to 1).
4. Press **P** while walking to print your position. Use it to adjust placements.

## Export notes (write `world/EXPORT.md`)

**Godot 4**
- Drop the GLBs into `res://world/`. They import as scenes, and Godot reads PBR materials from glTF.
- Sky: add a `WorldEnvironment` → `Environment` → Background `Sky` → `PanoramaSkyMaterial` with the panorama (convert WebP to PNG/EXR if your import settings need it). Set Ambient Light and Reflected Light source to `Sky`, so the panorama lights the props as it does in Three.js.
- Units match (1 unit = 1 m). Each prop's `height` in `assets.json` is its intended size. Scale the imported node so its AABB height matches.
- Rebuild placements from `world.json` → `props[].instances`. Three.js (x, z, rotY°) maps to Godot `position = Vector3(x, 0, z)`, `rotation_degrees.y = rotY`, because both are right-handed and Y-up.
- Colliders: add a `StaticBody3D` with a `CylinderShape3D` (radius ≈ 0.4 × the prop's footprint) or use "Create Trimesh Static Body" on the landmark. Use a `CharacterBody3D` first-person controller, eye height 1.7.
- Fog: `Environment.fog_enabled`, colour = `fog.color`, density ≈ `fog.density`.

**Unity (URP/HDRP)**
- Install glTFast (`com.unity.cloud.gltfast`) and drag the GLBs in.
- Skybox: import the panorama as a texture (Texture Shape: 2D, wrap Clamp), create a material with the `Skybox/Panoramic` shader (Mapping: Latitude Longitude, 360), and set it in Lighting → Environment → Skybox Material. Set Environment Lighting Source to Skybox and regenerate lighting so reflections match.
- Unity is **left-handed**: place props at `(x, 0, -z)` with `rotation.y = -rotY` (or flip the whole root on Z).
- Colliders: a `CapsuleCollider` or `MeshCollider` per prop, and a Starter Assets First Person controller (eye height 1.7).
- Fog: Lighting → Other Settings → Fog, Exponential, colour = `fog.color`.

**Unreal (quick note):** import the GLBs with the glTF Importer, use an HDRI Backdrop with the panorama, and multiply metres by 100 for centimetres.

## Output
- `world/index.html`: the walkable scene.
- `world/world.json`: the scene data.
- `world/assets/`: web-optimised GLBs and the panorama, so the scene doesn't depend on remote URLs.
- `world/EXPORT.md`: the Godot and Unity notes above, filled in with this world's file names and values.

Hand off to **world-producer**, or tell the user how to open the scene: `npx serve world`, then open the URL and click.
