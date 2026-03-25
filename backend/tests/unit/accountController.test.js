import { jest } from "@jest/globals";

const mockFindUnique = jest.fn();
const mockDelete = jest.fn();

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: {
    user: {
      findUnique: mockFindUnique,
      delete: mockDelete,
    },
  },
}));

const { getUser, deleteUser } = await import("../../src/controllers/accountController.js");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ─── getUser ────────────────────────────────────────────────────────────────

describe("userController - getUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 200 and the user when found", async () => {
    const req = { user: { id: 1 } };
    const res = createRes();

    const fakeUser = { id: 1, name: "Alice", email: "alice@example.com" };
    mockFindUnique.mockResolvedValue(fakeUser);

    await getUser(req, res);

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(fakeUser);
  });

  test("returns 404 when user is not found", async () => {
    const req = { user: { id: 99 } };
    const res = createRes();

    mockFindUnique.mockResolvedValue(null);

    await getUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  test("returns 500 on a database error", async () => {
    const req = { user: { id: 1 } };
    const res = createRes();

    const dbError = new Error("DB connection failed");
    mockFindUnique.mockRejectedValue(dbError);

    await getUser(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(dbError);
  });
});

// ─── deleteUser ──────────────────────────────────────────────────────────────

describe("userController - deleteUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 200 with a confirmation message on success", async () => {
    const req = { user: { id: 1 } };
    const res = createRes();

    mockDelete.mockResolvedValue({});

    await deleteUser(req, res);

    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Account deleted" });
  });

  test("returns 500 on a database error", async () => {
    const req = { user: { id: 1 } };
    const res = createRes();

    const dbError = new Error("Delete failed");
    mockDelete.mockRejectedValue(dbError);

    await deleteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(dbError);
  });
});