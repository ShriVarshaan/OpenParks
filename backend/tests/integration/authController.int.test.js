import { jest } from "@jest/globals";

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
    default: {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
    },
}));

jest.unstable_mockModule("bcrypt", () => ({
    default: {
        hash: jest.fn(),
        compare: jest.fn(),
    },
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
    default: {
        sign: jest.fn(),
    },
}));

jest.unstable_mockModule("../../src/controllers/sendVerification.js", () => ({
    sendVerification: jest.fn(),
}));


const { default: prisma }               = await import("../../src/config/prisma.js");
const { default: bcrypt }               = await import("bcrypt");
const { default: jwt }                  = await import("jsonwebtoken");
const { sendVerification }              = await import("../../src/controllers/sendVerification.js");
const { signup, login }                 = await import("../../src/controllers/authController.js");

const buildReq = (body = {}) => ({ body });

const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
};

const mockExistingUser = {
    id: 1,
    email: "jane@example.com",
    password: "hashed_password",
    username: "jane",
    validated: true,
};

const mockNewUser = {
    id: 2,
    email: "john@example.com",
    password: "hashed_password",
    username: "john",
};

const signupBody = {
    email: "john@example.com",
    password: "plaintext123",
    username: "john",
};

const loginBody = {
    email: "jane@example.com",
    password: "plaintext123",
};


describe("signup", () => {
    afterEach(() => jest.clearAllMocks());

    describe("409 - user already exists", () => {
        it("returns 409 when the email is already registered", async () => {
            prisma.user.findUnique.mockResolvedValue(mockExistingUser);
            const res = buildRes();

            await signup(buildReq(signupBody), res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({ message: "User exists already" });
        });

        it("does not send a verification email if the user already exists", async () => {
            prisma.user.findUnique.mockResolvedValue(mockExistingUser);

            await signup(buildReq(signupBody), buildRes());

            expect(sendVerification).not.toHaveBeenCalled();
        });

        it("does not create a new user record if the email is taken", async () => {
            prisma.user.findUnique.mockResolvedValue(mockExistingUser);

            await signup(buildReq(signupBody), buildRes());

            expect(prisma.user.create).not.toHaveBeenCalled();
        });
    });

    describe("201 - successful signup", () => {
        beforeEach(() => {
            prisma.user.findUnique.mockResolvedValue(null);
            prisma.user.create.mockResolvedValue(mockNewUser);
            bcrypt.hash.mockResolvedValue("hashed_password");
            jwt.sign.mockReturnValue("mock.jwt.token");
            sendVerification.mockResolvedValue();
        });

        it("sends a verification email to the new user", async () => {
            await signup(buildReq(signupBody), buildRes());

            expect(sendVerification).toHaveBeenCalledTimes(1);
            expect(sendVerification).toHaveBeenCalledWith(signupBody.email);
        });

        it("hashes the password with a salt round of 10", async () => {
            await signup(buildReq(signupBody), buildRes());

            expect(bcrypt.hash).toHaveBeenCalledWith(signupBody.password, 10);
        });

        it("creates the user with email, hashed password, and username", async () => {
            await signup(buildReq(signupBody), buildRes());

            expect(prisma.user.create).toHaveBeenCalledWith({
                data: {
                    email:    signupBody.email,
                    password: "hashed_password",
                    username: signupBody.username,
                },
            });
        });

        it("signs a JWT containing the new user's id", async () => {
            await signup(buildReq(signupBody), buildRes());

            expect(jwt.sign).toHaveBeenCalledWith(
                { id: mockNewUser.id },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );
        });

        it("returns 201 with a message, token, and user object", async () => {
            const res = buildRes();

            await signup(buildReq(signupBody), res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: "created successfully",
                token: "mock.jwt.token",
                user: { id: mockNewUser.id, email: mockNewUser.email },
            });
        });

        it("does not expose the hashed password in the response", async () => {
            const res = buildRes();

            await signup(buildReq(signupBody), res);

            const [payload] = res.json.mock.calls[0];
            expect(payload.user).not.toHaveProperty("password");
        });
    });

    describe("500 - unexpected error", () => {
        it("returns 500 when prisma.create throws", async () => {
            prisma.user.findUnique.mockResolvedValue(null);
            sendVerification.mockResolvedValue();
            bcrypt.hash.mockResolvedValue("hashed_password");
            prisma.user.create.mockRejectedValue(new Error("DB error"));
            const res = buildRes();

            await signup(buildReq(signupBody), res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "Sign up unsuccessful" });
        });

        it("does not throw — error is absorbed into the response", async () => {
            prisma.user.findUnique.mockRejectedValue(new Error("Timeout"));
            const res = buildRes();

            await expect(signup(buildReq(signupBody), res)).resolves.not.toThrow();
        });
    });
});


describe("login", () => {
    afterEach(() => jest.clearAllMocks());

    describe("401 - user not found", () => {
        it("returns 401 when no user matches the email", async () => {
            prisma.user.findUnique.mockResolvedValue(null);
            const res = buildRes();

            await login(buildReq(loginBody), res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
        });

        it("does not call bcrypt when the user is not found", async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            await login(buildReq(loginBody), buildRes());

            expect(bcrypt.compare).not.toHaveBeenCalled();
        });
    });

    describe("401 - wrong password", () => {
        it("returns 401 when the password does not match", async () => {
            prisma.user.findUnique.mockResolvedValue(mockExistingUser);
            bcrypt.compare.mockResolvedValue(false);
            const res = buildRes();

            await login(buildReq(loginBody), res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
        });

        it("compares against the stored hashed password", async () => {
            prisma.user.findUnique.mockResolvedValue(mockExistingUser);
            bcrypt.compare.mockResolvedValue(false);

            await login(buildReq(loginBody), buildRes());

            expect(bcrypt.compare).toHaveBeenCalledWith(
                loginBody.password,
                mockExistingUser.password
            );
        });
    });

    describe("403 - email not verified", () => {
        it("returns 403 when the user has not verified their email", async () => {
            prisma.user.findUnique.mockResolvedValue({ ...mockExistingUser, validated: false });
            bcrypt.compare.mockResolvedValue(true);
            sendVerification.mockResolvedValue();
            const res = buildRes();

            await login(buildReq(loginBody), res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: "Please verify your email before logging in",
            });
        });

        it("re-sends the verification email when the user is unverified", async () => {
            prisma.user.findUnique.mockResolvedValue({ ...mockExistingUser, validated: false });
            bcrypt.compare.mockResolvedValue(true);
            sendVerification.mockResolvedValue();

            await login(buildReq(loginBody), buildRes());

            expect(sendVerification).toHaveBeenCalledTimes(1);
            expect(sendVerification).toHaveBeenCalledWith(loginBody.email);
        });

        it("does not issue a JWT when the user is unverified", async () => {
            prisma.user.findUnique.mockResolvedValue({ ...mockExistingUser, validated: false });
            bcrypt.compare.mockResolvedValue(true);
            sendVerification.mockResolvedValue();

            await login(buildReq(loginBody), buildRes());

            expect(jwt.sign).not.toHaveBeenCalled();
        });
    });

    describe("200 - successful login", () => {
        beforeEach(() => {
            prisma.user.findUnique.mockResolvedValue(mockExistingUser);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue("mock.jwt.token");
        });

        it("signs a JWT containing the user's id", async () => {
            await login(buildReq(loginBody), buildRes());

            expect(jwt.sign).toHaveBeenCalledWith(
                { id: mockExistingUser.id },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );
        });

        it("returns 200 with a message, token, and user object", async () => {
            const res = buildRes();

            await login(buildReq(loginBody), res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: "logged in",
                token: "mock.jwt.token",
                user: { id: mockExistingUser.id, email: mockExistingUser.email },
            });
        });

        it("does not expose the hashed password in the response", async () => {
            const res = buildRes();

            await login(buildReq(loginBody), res);

            const [payload] = res.json.mock.calls[0];
            expect(payload.user).not.toHaveProperty("password");
        });

        it("does not send a verification email for a validated user", async () => {
            await login(buildReq(loginBody), buildRes());

            expect(sendVerification).not.toHaveBeenCalled();
        });
    });

    describe("401 - unexpected error", () => {
        it("returns 401 when prisma throws unexpectedly", async () => {
            prisma.user.findUnique.mockRejectedValue(new Error("DB timeout"));
            const res = buildRes();

            await login(buildReq(loginBody), res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials" });
        });

        it("does not throw — error is absorbed into the response", async () => {
            prisma.user.findUnique.mockRejectedValue(new Error("Crash"));
            const res = buildRes();

            await expect(login(buildReq(loginBody), res)).resolves.not.toThrow();
        });
    });
});