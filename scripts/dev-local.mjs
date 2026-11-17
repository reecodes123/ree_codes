/**
 * One-click local development launcher — `npm run dev:local` (what
 * run-tmt.bat uses).
 *
 * Makes "download → double-click → working site" possible with zero database
 * setup: if .env has no real DATABASE_URL yet, this starts a private
 * PostgreSQL that lives entirely inside the project folder (.localdb/),
 * creates the schema, seeds the starter accounts/articles on first run, and
 * then launches `next dev`. If .env points at a real database (e.g. your
 * Neon URL), the embedded one is skipped and that database is used instead —
 * so this same command keeps working after you finish SETUP.md.
 *
 * The .localdb/ folder is gitignored and safe to delete — you just lose
 * local test data and the next start reseeds from scratch.
 */

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_DB_DIR = path.join(projectRoot, ".localdb", "pgdata");
const LOCAL_DB_PORT = 5439; // uncommon port so it never fights a real Postgres
const LOCAL_DB_NAME = "tmt";
const LOCAL_DB_URL = `postgresql://postgres:local@localhost:${LOCAL_DB_PORT}/${LOCAL_DB_NAME}`;

/** Minimal .env parser — KEY=value / KEY="value", # comments. */
function loadDotEnv() {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*("?)(.*)\2\s*$/);
    if (m && !line.trim().startsWith("#") && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[3];
    }
  }
}

function isPlaceholder(url) {
  return !url || url.includes("USER:PASSWORD@HOST");
}

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true, // required on Windows for npx/npm (.cmd shims)
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    console.error(`\n[dev-local] "${command} ${args.join(" ")}" failed — see the output above.`);
    process.exit(result.status ?? 1);
  }
}

loadDotEnv();

let pg = null;

if (isPlaceholder(process.env.DATABASE_URL)) {
  console.log("[dev-local] No real DATABASE_URL in .env — using the built-in local database (.localdb/).");
  const { default: EmbeddedPostgres } = await import("embedded-postgres");

  // A stale pid file from a crashed/force-closed previous run blocks startup.
  const pidFile = path.join(LOCAL_DB_DIR, "postmaster.pid");
  if (fs.existsSync(pidFile)) {
    try {
      const { createConnection } = await import("node:net");
      await new Promise((resolve, reject) => {
        const sock = createConnection({ port: LOCAL_DB_PORT, host: "localhost" }, () => {
          sock.destroy();
          reject(new Error("in use"));
        });
        sock.on("error", resolve); // nothing listening → stale pid file
      });
      fs.rmSync(pidFile);
      console.log("[dev-local] Removed stale database lock from a previous crashed run.");
    } catch {
      console.error(`[dev-local] A database is already running on port ${LOCAL_DB_PORT} — is another copy of the portal open? Close it first.`);
      process.exit(1);
    }
  }

  pg = new EmbeddedPostgres({
    databaseDir: LOCAL_DB_DIR,
    user: "postgres",
    password: "local",
    port: LOCAL_DB_PORT,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => {},
  });

  const firstRun = !fs.existsSync(path.join(LOCAL_DB_DIR, "PG_VERSION"));
  if (firstRun) {
    console.log("[dev-local] First run — creating the local database (one-time, ~30s)…");
    await pg.initialise();
  }
  await pg.start();
  if (firstRun) await pg.createDatabase(LOCAL_DB_NAME);

  process.env.DATABASE_URL = LOCAL_DB_URL;

  console.log("[dev-local] Applying database schema…");
  run("npx", ["prisma", "migrate", "deploy"]);

  if (firstRun) {
    console.log("[dev-local] Seeding starter accounts and sample content…");
    run("npx", ["tsx", "prisma/seed.ts"]);
  }
} else {
  console.log("[dev-local] Using the DATABASE_URL from .env.");
  console.log("[dev-local] Making sure the schema is up to date…");
  run("npx", ["prisma", "migrate", "deploy"]);
}

console.log("[dev-local] Starting the portal — http://localhost:3000 (login: /login)");
const next = spawn("npx", ["next", "dev"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: true,
  env: process.env,
});

let shuttingDown = false;
async function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (pg) {
    console.log("\n[dev-local] Stopping the local database…");
    try {
      await pg.stop();
    } catch {
      // Already stopped — nothing to do.
    }
  }
  process.exit(code);
}

next.on("close", (code) => void shutdown(code ?? 0));
process.on("SIGINT", () => void shutdown(0));
process.on("SIGTERM", () => void shutdown(0));
