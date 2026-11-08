import fs from "fs";
import os from "os";
import path from "path";
import { ensureEnv } from "../../scripts/ensure-env.js";

let dir;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "openparks-env-"));
  fs.writeFileSync(path.join(dir, ".env.example"), "JWT_SECRET=example\n");
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

test("creates .env from .env.example when it is missing", () => {
  expect(ensureEnv(dir)).toBe(true);
  expect(fs.readFileSync(path.join(dir, ".env"), "utf8")).toBe("JWT_SECRET=example\n");
});

test("never overwrites an existing .env", () => {
  fs.writeFileSync(path.join(dir, ".env"), "JWT_SECRET=mine\n");

  expect(ensureEnv(dir)).toBe(false);
  expect(fs.readFileSync(path.join(dir, ".env"), "utf8")).toBe("JWT_SECRET=mine\n");
});
