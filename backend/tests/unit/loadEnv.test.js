import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("ENV_PATH points at backend/.env regardless of the working directory", async () => {
  const originalCwd = process.cwd();
  process.chdir(os.tmpdir());
  try {
    const { ENV_PATH } = await import("../../src/config/loadEnv.js");
    expect(ENV_PATH).toBe(path.join(backendDir, ".env"));
  } finally {
    process.chdir(originalCwd);
  }
});
