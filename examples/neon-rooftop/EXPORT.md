# Neon Rooftop: export notes

All assets are in `assets/`. The placements are in `world.json` → `props[].instances` (metres, Y-up, origin at the roof centre).

| File | What it is |
|---|---|
| `assets/sky-panorama.webp` | Equirectangular sky, 4096×2048 (Sloyd job `0q24lng0`) |
| `assets/water-tower.glb` | Landmark, scale to 8.0 m tall |
| `assets/vending-machine.glb` | Hero, 1.9 m. Add a warm point light `#ffb347` 1.2 m up, 1 m in front |
| `assets/hvac-unit.glb` | Scatter, 1.4 m, ×6 along the west parapet and north edge |
| `assets/satellite-dish.glb` | Scatter, 2.2 m, ×3 at the corners |
| `assets/crate-stack.glb` | Scatter, 1.2 m, ×6 in clusters |

Roof: 24 × 24 m, a 1 m parapet with a cyan `#18e0ff` top strip, wet concrete `#2a2d33` (roughness about 0.15 in puddles and 0.85 elsewhere).
Fog: `#2a1840`, exponential, density 0.012. Hemisphere light: sky `#8a6bff`, ground `#1a1030`, 0.5. Key light: directional `#18e0ff` 1.1 from (-12, 18, -8).
Spawn: (0.5, 9.8) looking toward (5, -7). Eye height 1.7 m.

## Godot 4
1. Copy `assets/` to `res://neon_rooftop/`. Convert the panorama to PNG if your import settings reject WebP for sky textures.
2. `WorldEnvironment` → `Environment`: Background = Sky, Sky Material = `PanoramaSkyMaterial` (panorama). Ambient Light Source = Sky (energy 0.9), Reflected Light Source = Sky. Fog on, colour `#2a1840`, density 0.012. Tonemap ACES.
3. For each instance in `world.json`, instance the GLB at `Vector3(x, 0, z)` with `rotation_degrees.y = rotY`, and scale it so its AABB height equals `height`.
4. Add a `StaticBody3D` + `CylinderShape3D` per prop, plus four box colliders for the parapet. Use a `CharacterBody3D` FPS controller with the camera at 1.7.
5. Add `OmniLight3D`s for the two accent lights: water tower magenta `#ff2bd6`, 5 m up and 2 m out, range 18; vending machines amber `#ffb347`, range 7.

## Unity (URP)
1. Install glTFast (`com.unity.cloud.gltfast`) and drop in `assets/`.
2. Import the panorama: Texture Shape 2D, Wrap Clamp. Create a material with the `Skybox/Panoramic` shader (Latitude Longitude, 360°). Lighting → Environment: Skybox Material = it, Source = Skybox, then Generate Lighting.
3. Unity is left-handed, so place each instance at `(x, 0, -z)` with `Euler(0, -rotY, 0)`. Scale to `height`.
4. Use `CapsuleCollider` per prop and the Starter Assets First Person Controller with the camera at 1.7.
5. Fog: Exponential, `#2a1840`, 0.012. Add point lights as in the Godot notes. A Bloom volume of about 1.0 intensity sells the neon.
