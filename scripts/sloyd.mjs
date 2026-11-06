#!/usr/bin/env node
// Minimal Sloyd client for the Worldbuilding Team skills.
// Talks to the hosted MCP server (https://api.sloyd.ai/api/mcp) over JSON-RPC,
// so it calls the exact same tools Claude does. Use it when the MCP server is
// not connected in your client, or for scripted batch runs.
//
// Credentials come only from the environment: SLOYD_CLIENT_ID, SLOYD_CLIENT_SECRET.
// Node 18+ (global fetch). No dependencies.
//
// Usage:
//   node scripts/sloyd.mjs balance
//   node scripts/sloyd.mjs styles
//   node scripts/sloyd.mjs call <tool> '<json args>'        -> prints {"jobId": ...}
//   node scripts/sloyd.mjs wait <jobId> [maxMinutes]        -> polls get_job (wait: 30) until done
//   node scripts/sloyd.mjs download <jobId> <outDir>        -> waits, then saves GLB / image / panorama + cubemap faces
//
// Exit codes: 0 ok, 2 = 402 insufficient credits, 3 = 429 too many concurrent jobs, 1 = other error.

import { mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";

const MCP_URL = process.env.SLOYD_MCP_URL || "https://api.sloyd.ai/api/mcp";
const ID = process.env.SLOYD_CLIENT_ID;
const SECRET = process.env.SLOYD_CLIENT_SECRET;

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}
if (!ID || !SECRET) die("Set SLOYD_CLIENT_ID and SLOYD_CLIENT_SECRET in your environment.");

let rpcId = 0;
async function rpc(method, params) {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "x-client-id": ID,
      "x-client-secret": SECRET,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
  });
  const text = await res.text();
  if (res.status === 401) die("401 Unauthorized: check SLOYD_CLIENT_ID / SLOYD_CLIENT_SECRET.");
  // Streamable HTTP may answer as SSE ("data: {...}") or plain JSON.
  const line = text.split("\n").find((l) => l.startsWith("data: "));
  const msg = JSON.parse(line ? line.slice(6) : text);
  if (msg.error) die(`MCP error: ${JSON.stringify(msg.error)}`);
  return msg.result;
}

async function callTool(name, args = {}) {
  const result = await rpc("tools/call", { name, arguments: args });
  const text = (result.content || []).map((c) => c.text || "").join("\n");
  if (result.isError) {
    if (/402|Insufficient|Payment Required/i.test(text)) die(`402 Insufficient credits: ${text}`, 2);
    if (/429|Too Many|concurrent/i.test(text)) die(`429 Too many concurrent jobs (max 5): ${text}`, 3);
    die(`Tool error from ${name}: ${text}`);
  }
  if (result.structuredContent) return result.structuredContent;
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

async function waitFor(jobId, maxMinutes = 15) {
  const deadline = Date.now() + maxMinutes * 60_000;
  while (Date.now() < deadline) {
    const job = await callTool("get_job", { jobId, wait: 30 });
    if (job.done) {
      if (job.status === "error" || job.isSuccess === false) die(`Job ${jobId} failed: ${job.errorMessage || JSON.stringify(job)}`);
      return job;
    }
    console.error(`[${new Date().toISOString().slice(11, 19)}] ${jobId} ${job.status || "running"}...`);
  }
  die(`Timed out waiting for ${jobId}`);
}

async function save(url, path) {
  const res = await fetch(url);
  if (!res.ok) die(`Download failed ${res.status} for ${url}`);
  await writeFile(path, Buffer.from(await res.arrayBuffer()));
  return path;
}

function extOf(url, fallback) {
  const e = extname(new URL(url).pathname);
  return e || fallback;
}

const [cmd, ...rest] = process.argv.slice(2);
const out = (o) => console.log(JSON.stringify(o, null, 2));

switch (cmd) {
  case "balance":
    out(await callTool("get_credit_balance"));
    break;
  case "styles":
    out(await callTool("get_generation_styles"));
    break;
  case "tools":
    out((await rpc("tools/list", {})).tools.map((t) => t.name));
    break;
  case "call": {
    const [tool, json = "{}"] = rest;
    out(await callTool(tool, JSON.parse(json)));
    break;
  }
  case "wait":
    out(await waitFor(rest[0], Number(rest[1] || 15)));
    break;
  case "download": {
    const [jobId, dir = "."] = rest;
    const job = await waitFor(jobId);
    await mkdir(dir, { recursive: true });
    const o = job.outputs || {};
    const saved = {};
    if (o.glbUrl) saved.glb = await save(o.glbUrl, join(dir, `${jobId}.glb`));
    if (o.imageUrl) saved.image = await save(o.imageUrl, join(dir, `${jobId}${extOf(o.imageUrl, ".png")}`));
    if (o.panoramaUrl) saved.panorama = await save(o.panoramaUrl, join(dir, `${jobId}.panorama${extOf(o.panoramaUrl, ".jpg")}`));
    if (o.cubemapFaceUrls) {
      saved.cubemap = {};
      // Array order is +X, -X, +Y, -Y, +Z, -Z (file suffixes _cxpos ... _czneg). Objects keep their own keys.
      const NAMES = ["px", "nx", "py", "ny", "pz", "nz"];
      const faces = Array.isArray(o.cubemapFaceUrls)
        ? o.cubemapFaceUrls.map((url, i) => [NAMES[i] ?? String(i), url])
        : Object.entries(o.cubemapFaceUrls);
      for (const [face, url] of faces) {
        saved.cubemap[face] = await save(url, join(dir, `${jobId}.face-${face}${extOf(url, ".jpg")}`));
      }
    }
    out({ jobId, outputs: o, saved });
    break;
  }
  default:
    die("Usage: sloyd.mjs balance | styles | tools | call <tool> '<json>' | wait <jobId> [min] | download <jobId> <dir>");
}
