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

  test("never sends the password hash to the client", async () => {
    mockFindUnique.mockResolvedValue({ id: 1, username: "demo", email: "d@x.test", password: "$2b$10$hash", Verified: true });
    const res = createRes();

    await getUser({ user: { id: 1 } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body).not.toHaveProperty("password");
    expect(body).toEqual({ id: 1, username: "demo", email: "d@x.test", Verified: true });
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