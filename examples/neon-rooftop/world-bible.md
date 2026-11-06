# World bible: Neon Rooftop

> Prompt: "make me a cyberpunk rooftop at night I can walk around in"

## One-line pitch
A rain-slick rooftop 40 storeys above a neon megacity, ten minutes after a downpour. You can hear the city but you can't reach it.

## Core
| Field | Value |
|---|---|
| Biome | Dense vertical megacity, rooftop level |
| Era | Near-future cyberpunk, roughly 2080s, retrofitted 20th-century concrete |
| Time of day | Night, about 23:00. The sky is lit from below by the city, so there is no true black |
| Weather | Just after rain: wet surfaces, thin haze, low cloud ceiling |
| Mood | Lonely, electric, quietly dangerous. You're a stowaway on a roof you shouldn't be on |
| Genre reference | Blade Runner 2049 rooftops, Ghost in the Shell skyline shots |
| Player scale | 1.7 m eye height. Walkable roof about 30 x 30 m |
| Art style | `Realistic` for every asset (one style for the whole world) |

## Palette
| Role | Hex | Use |
|---|---|---|
| Key light (neon) | `#ff2bd6` | Magenta signage, rim light on props |
| Fill light (neon) | `#18e0ff` | Cyan signage, cool fill |
| Ambient | `#1a1030` | Sky glow and fog colour |
| Surface | `#2a2d33` | Wet concrete roof, rusted steel |
| Accent (warm) | `#ffb347` | Vending machine light, one warm pocket so the cold palette has a focal point |

Lighting rule: **cold everywhere and warm in one place.** The warm pocket is the vending machine, and it pulls the player toward the midground.

## Composition
Spawn the player at the south edge of the roof looking north.

| Layer | Distance | Contents | Job |
|---|---|---|---|
| Foreground | 0–6 m | HVAC units, crate stacks, puddles | Frames the view, gives scale, blocks a straight line |
| Midground | 6–18 m | Vending machine (warm focal point), satellite dishes | Points of interest the player walks to |
| Background (on roof) | 18–25 m | Water tower (landmark, silhouette against the sky) | Readable from anywhere, so the player can orient |
| Far background | Skybox | Megacity towers, holo-billboards, cloud ceiling | Mood, scale, sense of place |

The landmark sits off-centre (north-east third) so the spawn view follows the rule of thirds. The path from spawn to landmark bends around the vending machine instead of running straight.

## Landmarks and props (asset list)
| ID | Role | Prompt core | Real size | Count in scene |
|---|---|---|---|---|
| `water-tower` | Landmark | Rooftop water tower on steel legs, wrapped in a broken magenta neon tube | 8 m tall | 1 |
| `vending-machine` | Hero prop (warm focal point) | Glowing Japanese-style drinks vending machine, scuffed | 1.9 m tall | 1 (2 is fine) |
| `hvac-unit` | Scatter | Industrial rooftop air-conditioning unit, big fan grille, rust streaks | 1.4 m tall | 5–7 |
| `satellite-dish` | Scatter / silhouette | Rooftop satellite dish on a tripod mount with cables | 2.2 m tall | 3 |
| `crate-stack` | Scatter | Stack of plastic shipping crates and a barrel, stickers and grime | 1.2 m tall | 4–6 |

## Sky brief (for sky-artist)
A 360 panorama seen from a rooftop high in a dense cyberpunk megacity at night. The horizon sits at eye level. Tall towers ring the view, covered in magenta and cyan neon signs and holographic billboards. A low cloud ceiling glows purple from the city lights below. Haze, thin rain mist and distant flying-car light trails. The lower half shows streets far below, because the roof surface will cover it.

Variants to offer: `blue-hour` (same city, dusk, before the neon dominates) and `storm` (heavy rain, lightning in the cloud ceiling).

## Do not
- Daylight, sun discs, clear starry skies (they break "lit from below").
- Props in a different style from the rest. All use `Realistic`.
- Greenery. The roof is hostile, not cosy.
