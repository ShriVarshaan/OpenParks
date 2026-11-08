// Loads backend/.env by absolute path, so the server works no matter which
// directory it is started from. Import this module first wherever env vars are read.
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

export const ENV_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env")

dotenv.config({ path: ENV_PATH, quiet: true })
