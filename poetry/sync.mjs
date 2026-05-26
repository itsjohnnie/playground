#!/usr/bin/env node
// poetry/sync.mjs
//
// One command that does the boring stuff:
//   1. Starts server.js with --watch so edits to server.js restart it.
//   2. Polls origin every few seconds and `git pull --ff-only`s when
//      upstream has new commits. The pull updates the files; --watch
//      catches server.js changes; the browser picks up public/* on the
//      next request (no-store headers).
//
// Net result: you run `npm run sync` once. When changes are pushed from
// anywhere, your local server is up-to-date a few seconds later. The
// only thing you have to do is refresh the browser.

import { spawn, execSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const POLL_MS = 5_000;

const __dirname = dirname(fileURLToPath(import.meta.url));
const poetryDir = __dirname;
const serverPath = resolve(__dirname, "server.js");

function tag(s) { return `\x1b[2m[sync]\x1b[0m ${s}`; }
function ok(s)  { return `\x1b[32m[sync]\x1b[0m ${s}`; }
function warn(s){ return `\x1b[33m[sync]\x1b[0m ${s}`; }

function inGitRepo() {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore", cwd: poetryDir });
    return true;
  } catch {
    return false;
  }
}

function commitsBehind() {
  try {
    const n = execSync("git rev-list --count HEAD..@{u}", {
      cwd: poetryDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return Number(n) || 0;
  } catch {
    return 0;
  }
}

function localChanges() {
  try {
    const out = execSync("git status --porcelain", {
      cwd: poetryDir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

console.log(tag("starting server with --watch…"));
const server = spawn("node", ["--watch", serverPath], {
  stdio: "inherit",
  cwd: poetryDir,
});

server.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    console.log(warn(`server exited with code ${code}`));
  }
});

if (inGitRepo()) {
  console.log(tag(`watching origin for new commits (every ${POLL_MS / 1000}s)…`));
  setInterval(pollOnce, POLL_MS);
} else {
  console.log(warn("not a git repo — sync loop disabled, server only."));
}

let pulling = false;
function pollOnce() {
  if (pulling) return;
  try {
    execSync("git fetch --quiet", { cwd: poetryDir, stdio: "ignore" });
  } catch {
    return; // network blip — try again next tick
  }

  const behind = commitsBehind();
  if (behind === 0) return;

  if (localChanges()) {
    console.log(warn(`origin has ${behind} new commit${behind > 1 ? "s" : ""}, but you have local changes — skipping pull. commit or stash, then I'll catch up.`));
    return;
  }

  pulling = true;
  console.log(ok(`origin has ${behind} new commit${behind > 1 ? "s" : ""} — pulling…`));
  try {
    execSync("git pull --ff-only", { cwd: poetryDir, stdio: "inherit" });
    console.log(ok("up to date. server restarts itself if server.js changed; refresh the browser for public/* changes."));
  } catch (e) {
    console.log(warn("pull failed — probably a non-fast-forward. fix manually then I'll resume."));
  } finally {
    pulling = false;
  }
}

function shutdown() {
  console.log(tag("shutting down…"));
  server.kill("SIGINT");
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
