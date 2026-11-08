import { buildPoolConfig, buildTransportOptions, parseCorsOrigins } from "../../src/config/env.js";

const DEFAULT_ORIGINS = ["http://localhost:5173", "http://localhost:5174"];

describe("buildPoolConfig", () => {
  test("uses DATABASE_URL and no SSL by default", () => {
    expect(buildPoolConfig({ DATABASE_URL: "u" })).toEqual({ connectionString: "u" });
  });

  test("enables lenient SSL only when DB_SSL is 'true'", () => {
    expect(buildPoolConfig({ DATABASE_URL: "u", DB_SSL: "true" }).ssl).toEqual({ rejectUnauthorized: false });
  });

  test("DB_SSL=false means no ssl key", () => {
    expect(buildPoolConfig({ DATABASE_URL: "u", DB_SSL: "false" })).not.toHaveProperty("ssl");
  });
});

describe("buildTransportOptions", () => {
  test("omits auth when EMAIL_USER is blank (Mailpit)", () => {
    expect(
      buildTransportOptions({ EMAIL_HOST: "localhost", EMAIL_PORT: "1025", EMAIL_USER: "", EMAIL_PASS: "" })
    ).toEqual({ host: "localhost", port: 1025, secure: false });
  });

  test("includes auth and secure on port 465", () => {
    expect(
      buildTransportOptions({ EMAIL_HOST: "h", EMAIL_PORT: "465", EMAIL_USER: "a", EMAIL_PASS: "b" })
    ).toEqual({ host: "h", port: 465, secure: true, auth: { user: "a", pass: "b" } });
  });
});

describe("parseCorsOrigins", () => {
  test("falls back to local Vite origins when unset", () => {
    expect(parseCorsOrigins(undefined)).toEqual(DEFAULT_ORIGINS);
  });

  test("falls back to local Vite origins when blank", () => {
    expect(parseCorsOrigins("  ")).toEqual(DEFAULT_ORIGINS);
  });

  test("splits, trims and drops empty entries", () => {
    expect(parseCorsOrigins("https://a.com, https://b.com,")).toEqual(["https://a.com", "https://b.com"]);
  });
});
