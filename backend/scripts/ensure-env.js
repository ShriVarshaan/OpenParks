// Creates backend/.env from .env.example on first setup. Never overwrites an existing .env.
// Usage: node scripts/ensure-env.js (run by `npm run setup`)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const BACKEND_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export function ensureEnv(dir = BACKEND_DIR) {
  const target = path.join(dir, ".env");
  if (fs.existsSync(target)) return false;
  fs.copyFileSync(path.join(dir, ".env.example"), target);
  return true;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  console.log(ensureEnv() ? "Created backend/.env from .env.example" : "backend/.env already exists, left unchanged");
}
