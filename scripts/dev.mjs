import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const faceDir = path.join(rootDir, "services", "face-api");
const venvPython = path.join(faceDir, ".venv", "bin", "python");
const pythonCmd = existsSync(venvPython) ? venvPython : "python3";
const faceApiReload = process.env.FACE_API_RELOAD === "true";

const children = [];
let shuttingDown = false;

function start(name, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    console.error(`\n[${name}] exited (${signal ?? code}). Stopping all services...`);
    shutdown(code ?? 1);
  });

  children.push(child);
  return child;
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => process.exit(exitCode), 300);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log(`Starting Next.js + Face API (face reload: ${faceApiReload ? "on" : "off"})...\n`);

start("next", "npm", ["run", "dev:next"], rootDir);
start(
  "face-api",
  pythonCmd,
  [
    "-m",
    "uvicorn",
    "main:app",
    "--host",
    "0.0.0.0",
    "--port",
    "8000",
    ...(faceApiReload ? ["--reload"] : []),
  ],
  faceDir
);
