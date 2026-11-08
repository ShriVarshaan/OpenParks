// Pure helpers that turn environment variables into library config.
// Kept free of side effects so local, test and hosted setups share one code path.

const DEFAULT_CORS_ORIGINS = ["http://localhost:5173", "http://localhost:5174"];

// Hosted Postgres (e.g. Supabase) needs SSL; the local Docker PostGIS has none.
export function buildPoolConfig(env = process.env) {
  const config = { connectionString: env.DATABASE_URL };
  if (env.DB_SSL === "true") {
    config.ssl = { rejectUnauthorized: false };
  }
  return config;
}

// Mailpit (local) accepts mail without credentials, so auth is only sent when a user is configured.
export function buildTransportOptions(env = process.env) {
  const options = {
    host: env.EMAIL_HOST,
    port: Number(env.EMAIL_PORT),
    secure: env.EMAIL_PORT === "465",
  };
  if (env.EMAIL_USER) {
    options.auth = { user: env.EMAIL_USER, pass: env.EMAIL_PASS };
  }
  return options;
}

export function parseCorsOrigins(value) {
  const origins = (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length > 0 ? origins : DEFAULT_CORS_ORIGINS;
}
