import { jest } from "@jest/globals";

const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockHash = jest.fn();
const mockCompare = jest.fn();
const mockSign = jest.fn();

process.env.JWT_SECRET = "testsecret";

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: {
    user: {
      findUnique: mockFindUnique,
      create: mockCreate,
    },
  },
}));

jest.unstable_mockModule("bcrypt", () => ({
  default: {
    hash: mockHash,
    compare: mockCompare,
  },
}));

jest.unstable_mockModule("../../src/controllers/sendVerification.js", () => ({
  sendVerification: jest.fn(),
}));

jest.unstable_mockModule("nodemailer", () => ({
  default: {
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest.fn(),
    }),
  },
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: mockSign,
  },
}));

const { signup, login } = await import("../../src/controllers/authController.js");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("authController - signup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 409 if user already exists", async () => {
    const req = {
      body: {
        email: "test@example.com",
        password: "password123",
        username: "testuser",
      },
    };
    const res = createRes();

    mockFindUnique.mockResolvedValue({ id: 1, email: "test@example.com" });

    await signup(req, res);

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
    });
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "User exists already" });
  });

  test("creates a new user and returns token", async () => {
    const req = {
      body: {
        email: "new@example.com",
        password: "password123",
        username: "newuser",
      },
    };
    const res = createRes();

    mockFindUnique.mockResolvedValue(null);
    mockHash.mockResolvedValue("hashedPassword");
    mockCreate.mockResolvedValue({
      id: 2,
      email: "new@example.com",
      username: "newuser",
    });
    mockSign.mockReturnValue("fake-jwt-token");

    await signup(req, res);

    expect(mockHash).toHaveBeenCalledWith("password123", 10);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        email: "new@example.com",
        password: "hashedPassword",
        username: "newuser",
      },
    });
    expect(mockSign).toHaveBeenCalledWith(
      { id: 2 },
      "testsecret",
      { expiresIn: "7d" }
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "created successfully",
      token: "fake-jwt-token",
      user: { id: 2, email: "new@example.com" },
    });
  });

  test("returns 500 if signup throws an error", async () => {
    const req = {
      body: {
        email: "error@example.com",
        password: "password123",
        username: "erroruser",
      },
    };
    const res = createRes();

    mockFindUnique.mockRejectedValue(new Error("DB error"));

    await signup(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Sign up unsuccessful" });
  });
});

describe("authController - login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 401 if user does not exist", async () => {
    const req = {
      body: {
        email: "missing@example.com",
        password: "password123",
      },
    };
    const res = createRes();

    mockFindUnique.mockResolvedValue(null);

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
  });

  test("returns 401 if password is incorrect", async () => {
    const req = {
      body: {
        email: "test@example.com",
        password: "wrongpassword",
      },
    };
    const res = createRes();

    mockFindUnique.mockResolvedValue({
      id: 1,
      email: "test@example.com",
      password: "hashedPassword",
      validated: true,
    });
    mockCompare.mockResolvedValue(false);

    await login(req, res);

    expect(mockCompare).toHaveBeenCalledWith("wrongpassword", "hashedPassword");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
  });

  test("logs in successfully with valid credentials", async () => {
    const req = {
      body: {
        email: "test@example.com",
        password: "password123",
      },
    };
    const res = createRes();

    mockFindUnique.mockResolvedValue({
      id: 1,
      email: "test@example.com",
      password: "hashedPassword",
      validated: true,
    });
    mockCompare.mockResolvedValue(true);
    mockSign.mockReturnValue("login-token");

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "logged in",
      token: "login-token",
      user: { id: 1, email: "test@example.com" },
    });
  });

  test("returns 401 if login throws an error", async () => {
    const req = {
      body: {
        email: "test@example.com",
        password: "password123",
      },
    };
    const res = createRes();

    mockFindUnique.mockRejectedValue(new Error("DB failure"));

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
  });
});
