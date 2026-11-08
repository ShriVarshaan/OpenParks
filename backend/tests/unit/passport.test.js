import { jest } from "@jest/globals";

const mockFindUnique = jest.fn();

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: { user: { findUnique: mockFindUnique } },
}));

const { verifyJwtPayload } = await import("../../src/config/passport.js");

const verify = (payload) =>
  new Promise((resolve) => verifyJwtPayload(payload, (err, user) => resolve({ err, user })));

beforeEach(() => jest.clearAllMocks());

test("accepts a token for a verified user", async () => {
  const user = { id: 1, Verified: true };
  mockFindUnique.mockResolvedValue(user);

  await expect(verify({ id: 1 })).resolves.toEqual({ err: null, user });
});

test("rejects a token for a user who has not verified their email", async () => {
  mockFindUnique.mockResolvedValue({ id: 2, Verified: false });

  await expect(verify({ id: 2 })).resolves.toEqual({ err: null, user: false });
});

test("rejects a token for a user that no longer exists", async () => {
  mockFindUnique.mockResolvedValue(null);

  await expect(verify({ id: 3 })).resolves.toEqual({ err: null, user: false });
});
