import { jest } from "@jest/globals";
import { createLimiter, AUTH_LIMIT, OTP_LIMIT } from "../../src/middleware/rateLimit.js";

// Calls the middleware the way Express would, with the minimum req/res it needs.
const hit = async (limiter, ip = "203.0.113.1") => {
  const req = { ip, method: "POST", headers: {}, app: { get: () => false } };
  const res = {
    statusCode: 200,
    headers: {},
    headersSent: false,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    getHeader(name) { return this.headers[name.toLowerCase()]; },
    append(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json: jest.fn(),
    send: jest.fn(),
    on: jest.fn(),
  };
  const next = jest.fn();
  await limiter(req, res, next);
  return { res, next };
};

describe("rate limiting", () => {
  test("lets requests through up to the limit, then answers 429 with a JSON message", async () => {
    const limiter = createLimiter(3);

    for (let i = 0; i < 3; i++) {
      const { next } = await hit(limiter);
      expect(next).toHaveBeenCalled();
    }
    const { res, next } = await hit(limiter);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
    const body = res.json.mock.calls[0]?.[0] ?? res.send.mock.calls[0]?.[0];
    expect(body).toEqual({ message: "Too many attempts, please try again later" });
  });

  test("counts each client IP separately", async () => {
    const limiter = createLimiter(1);

    await hit(limiter, "203.0.113.1");
    const { next } = await hit(limiter, "203.0.113.2");

    expect(next).toHaveBeenCalled();
  });

  test("keeps the OTP limit tighter than the login/signup limit", () => {
    expect(OTP_LIMIT).toBeLessThan(AUTH_LIMIT);
  });
});
