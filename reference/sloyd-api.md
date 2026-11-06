# Sloyd API: what the Worldbuilding Team uses

Every skill in this plugin reads this file. It summarises the source of truth, `Sloydai/Horizon` → `api-dashboard/documentation/` (`mcp.md`, `endpoints/environments.md`, `endpoints/3d-generation.md`, `endpoints/model-tools.md`, `endpoints/jobs.md`, `pricing.md`, `errors.md`). It was checked against the live MCP `tools/list` on 2026-11-06. **Do not call any tool that isn't listed here.**

## Connect

Hosted MCP server: `https://api.sloyd.ai/api/mcp` (Streamable HTTP). Auth headers are `x-client-id` and `x-client-secret`. Read them from the environment variables `SLOYD_CLIENT_ID` and `SLOYD_CLIENT_SECRET`.

- **This plugin** ships `.mcp.json`, which reads those two env vars. Installing the plugin connects the server.
- **Manual (Claude Code):**
  ```bash
  claude mcp add --transport http sloyd https://api.sloyd.ai/api/mcp \
    --header "x-client-id: $SLOYD_CLIENT_ID" \
    --header "x-client-secret: $SLOYD_CLIENT_SECRET"
  ```
- **No MCP client?** Use `node ${CLAUDE_PLUGIN_ROOT}/scripts/sloyd.mjs` (it calls the same MCP tools over JSON-RPC, with no dependencies), or the REST endpoints below.

Never write the secret into a file, a commit, a scene, or a log. Generated scenes contain only public asset URLs or local paths.

## Tools used by this team

| MCP tool | REST | Cost (credits) | Used by |
|---|---|---|---|
| `get_credit_balance` | `GET /user/api-access/balance` | free | all (preflight) |
| `get_generation_styles` | `GET /gen-styles` (+ built-ins) | free | world-director, environment-artist |
| `generate_skybox` | `POST /jobs/text-to-worldbox` `{prompt, genStyleId?}` | 25 | sky-artist |
| `edit_skybox` | `POST /jobs/skybox-edit` `{jobId, prompt, genStyleId?}` | not listed separately on the pricing page; budget 25 like a skybox | sky-artist |
| `upload_image` | `POST /jobs/image-upload` (multipart `file`) | free | sky-artist, environment-artist |
| `generate_skybox_from_image` | `POST /jobs/skybox-from-image` `{imageJobId, prompt?, genStyleId?}` | 25 | sky-artist |
| `generate_image` | `POST /jobs/text-to-image` `{prompt, aspectRatio?, genStyleId?, referenceImageJobId?}` | 10 | sky-artist (concept art), environment-artist (style sheet) |
| `edit_image` | `POST /jobs/image-edit` `{jobId, prompt?, genStyleId?}` | 15 | environment-artist |
| `generate_3d_from_text` | `POST /jobs/text-to-3d` `{prompt, genStyleId?, textureResolution?, targetFaceCount?, topology?}` | 25 (textured) | environment-artist |
| `generate_3d_from_image` | `POST /jobs/image-to-3d` (`file` or `imageJobId`) | 20 (textured) | environment-artist |
| `generate_3d_from_images` | `POST /jobs/multi-image-to-3d` | 30–40 | environment-artist (rare) |
| `retexture_model` | `POST /jobs/retexture` `{jobId, prompt, textureResolution?}` | 15 | environment-artist (style fixes) |
| `split_model_into_parts` | `POST /jobs/split-to-parts` `{jobId, method?, numberOfParts?}` | 40 | environment-artist (modular kits, rare) |
| `get_job` | `GET /jobs/{jobId}` | free | all |

Prices are from [sloyd.ai/api/pricing](https://www.sloyd.ai/api/pricing). The 3D rate is 10 base, +5 for text input, +10 for texturing, +5 for quads, +10 for 500K+ faces. 75 credits = USD 1. Re-check the page if a 402 surprises you.

REST base URL: `https://api.sloyd.ai/api`. Send the same two headers.

## The job loop

1. A generation tool returns `{ "jobId": "..." }` immediately.
2. Call `get_job` with `{ "jobId": "...", "wait": 30 }`. Each call blocks for up to 30 s. Repeat until `done` is `true`.
3. On success, `outputs` contains:
   - 3D: `glbUrl`, also at `https://storage.googleapis.com/ai-services-quality/jobs/{jobId}.glb`
   - image: `imageUrl`
   - skybox: `panoramaUrl` (equirectangular WebP; it came back 4096×4096 in our test, so treat it as equirectangular whatever its aspect ratio) and `cubemapFaceUrls`, an **array of 6 URLs in the order +X, −X, +Y, −Y, +Z, −Z** (file suffixes `_cxpos`, `_cxneg`, `_cypos`, `_cyneg`, `_czpos`, `_czneg`)
4. `status: "error"` means the job failed. Credits are refunded automatically. Retry once with a reworded prompt, then report the failure.

Skyboxes took about 1 minute and textured props 1–3 minutes in our run.

## Limits and errors

- **5 concurrent jobs per key** (pending or running). Run work in waves of at most 5. Keep a list of live job IDs and start the next job only when one finishes.
- **402 Payment Required** means not enough credits. The body is `{available, required}` and nothing is charged. Stop and tell the user the shortfall and the top-up link https://api-dashboard.sloyd.ai. Never retry in a loop.
- **429 Too Many Requests** means more than 5 concurrent jobs. Wait for a running job to reach `done`, then retry. Don't treat it as a failure.
- **422** means a bad parameter. Fix the parameter and don't retry blindly. A **404 `Unknown genStyleId`** means the style was mistyped.
- **401** means bad or missing credentials. Ask the user to export `SLOYD_CLIENT_ID` and `SLOYD_CLIENT_SECRET`.

## Preflight (every skill that spends credits)

1. `get_credit_balance` (free).
2. Add up the plan with the cost table and show it to the user, e.g. "1 skybox (25) + 5 props (125) = 150 credits, balance 170".
3. If the balance covers it, continue. If it doesn't, propose a smaller plan, such as fewer scatter props or skipping the sky variants, before spending anything.

## Helper script

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/sloyd.mjs balance
node ${CLAUDE_PLUGIN_ROOT}/scripts/sloyd.mjs call generate_skybox '{"prompt":"...","genStyleId":"Realistic"}'
node ${CLAUDE_PLUGIN_ROOT}/scripts/sloyd.mjs download <jobId> ./world/assets/raw    # waits (get_job wait:30), then saves GLB / panorama / faces
```
Exit code 2 means 402 and exit code 3 means 429.
