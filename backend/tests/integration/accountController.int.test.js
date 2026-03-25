import { jest } from "@jest/globals";

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
    default: {
        user: {
            findUnique: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

const { default: prisma } = await import("../../src/config/prisma.js");
const { getUser, deleteUser } = await import("../../src/controllers/accountController.js");

const mockUser = { id: 1, name: "Soorya Ramesh", email: "soorya@gmail.com" };

const buildReq = (userId = 1) => ({ user: { id: userId } });

const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe("getUser", () => {
    afterEach(() => jest.clearAllMocks());

    describe("200 - user found", () => {
        it("calls prisma with the correct numeric id", async () => {
            prisma.user.findUnique.mockResolvedValue(mockUser);

            await getUser(buildReq("1"), buildRes());

            expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: 1 },
            });
        });

        it("returns 200 with the user payload", async () => {
            prisma.user.findUnique.mockResolvedValue(mockUser);
            const res = buildRes();

            await getUser(buildReq("1"), res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockUser);
        });
    });

    describe("404 - user not found", () => {
        it("returns 404 when prisma returns null", async () => {
            prisma.user.findUnique.mockResolvedValue(null);
            const res = buildRes();

            await getUser(buildReq("99"), res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
        });

        it("returns 404 when prisma returns undefined", async () => {
            prisma.user.findUnique.mockResolvedValue(undefined);
            const res = buildRes();

            await getUser(buildReq("99"), res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe("500 - database error", () => {
        it("returns 500 with the thrown error", async () => {
            const dbError = new Error("DB connection failed");
            prisma.user.findUnique.mockRejectedValue(dbError);
            const res = buildRes();

            await getUser(buildReq("1"), res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(dbError);
        });

        it("does not throw — error is contained in the response", async () => {
            prisma.user.findUnique.mockRejectedValue(new Error("Timeout"));
            const res = buildRes();

            await expect(getUser(buildReq("1"), res)).resolves.not.toThrow();
        });
    });

    describe("id coercion", () => {
        it("converts a string id to a number before querying", async () => {
            prisma.user.findUnique.mockResolvedValue(mockUser);

            await getUser(buildReq("42"), buildRes());

            expect(prisma.user.findUnique).toHaveBeenCalledWith({
                where: { id: 42 },
            });
        });
    });
});

describe("deleteUser", () => {
    afterEach(() => jest.clearAllMocks());

    describe("200 - successful deletion", () => {
        it("calls prisma.delete with the correct numeric id", async () => {
            prisma.user.delete.mockResolvedValue(mockUser);

            await deleteUser(buildReq("1"), buildRes());

            expect(prisma.user.delete).toHaveBeenCalledTimes(1);
            expect(prisma.user.delete).toHaveBeenCalledWith({
                where: { id: 1 },
            });
        });

        it("returns 200 with a confirmation message", async () => {
            prisma.user.delete.mockResolvedValue(mockUser);
            const res = buildRes();

            await deleteUser(buildReq("1"), res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: "Account deleted" });
        });
    });

    describe("500 - database error", () => {
        it("returns 500 with the thrown error", async () => {
            const dbError = new Error("Foreign key constraint");
            prisma.user.delete.mockRejectedValue(dbError);
            const res = buildRes();

            await deleteUser(buildReq("1"), res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(dbError);
        });

        it("does not throw — error is contained in the response", async () => {
            prisma.user.delete.mockRejectedValue(new Error("Timeout"));
            const res = buildRes();

            await expect(deleteUser(buildReq("1"), res)).resolves.not.toThrow();
        });
    });

    describe("id coercion", () => {
        it("converts a string id to a number before deleting", async () => {
            prisma.user.delete.mockResolvedValue(mockUser);

            await deleteUser(buildReq("7"), buildRes());

            expect(prisma.user.delete).toHaveBeenCalledWith({
                where: { id: 7 },
            });
        });
    });
});