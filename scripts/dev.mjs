import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const isWindows = process.platform === "win32";
const rootDir = process.cwd();
const faceDir = path.join(rootDir, "services", "face-api");
const npmCli = process.env.npm_execpath ?? path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const venvPython = isWindows
  ? path.join(faceDir, ".venv", "Scripts", "python.exe")
  : path.join(faceDir, ".venv", "bin", "python");
const pythonCmd = existsSync(venvPython) ? venvPython : (isWindows ? "python" : "python3");
const faceApiReload = process.env.FACE_API_RELOAD === "true";

const children = [];
let shuttingDown = false;

function start(name, command, args, cwd) {
  const isNpmCommand = isWindows && command === "npm";
  const child = spawn(
    isNpmCommand ? process.execPath : command,
    isNpmCommand ? [npmCli, ...args] : args,
    {
      cwd,
      stdio: "inherit",
      env: process.env,
    },
  );

  child.on("error", (error) => {
    if (shuttingDown) {
      return;
    }

    console.error(`\n[${name}] failed to start: ${error.message}`);
    shutdown(1);
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
