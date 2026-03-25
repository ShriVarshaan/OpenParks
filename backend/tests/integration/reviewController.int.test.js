import { jest } from "@jest/globals";
 
jest.unstable_mockModule("../../src/config/prisma.js", () => ({
    default: {
        review: {
            findMany:   jest.fn(),
            findUnique: jest.fn(),
            create:     jest.fn(),
            update:     jest.fn(),
            delete:     jest.fn(),
        },
        park: {
            findUnique: jest.fn(),
        },
    },
}));
 
const { default: prisma } = await import("../../src/config/prisma.js");
const {
    getAllReviewsPark,
    addReviewPark,
    getAllReviewsUser,
    getReviewById,
    updateReview,
    deleteReview,
} = await import("../../src/controllers/reviewController.js");
 
const buildReq = ({ params = {}, body = {}, user = { id: 1 } } = {}) => ({
    params,
    body,
    user,
});
 
const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
};
 
const mockReview = {
    id:      10,
    user_id: 1,
    park_id: 5,
    content: "Great park!",
    rating:  4,
};
 
const mockPark = { id: 5, name: "Cannon Hill Park" };
 
describe("getAllReviewsPark", () => {
    afterEach(() => jest.clearAllMocks());
 
    it("queries reviews with the correct numeric park_id", async () => {
        prisma.review.findMany.mockResolvedValue([mockReview]);
 
        await getAllReviewsPark(buildReq({ params: { parkId: "5" } }), buildRes());
 
        expect(prisma.review.findMany).toHaveBeenCalledWith({ where: { park_id: 5 } });
    });
 
    it("returns 200 with the reviews array", async () => {
        prisma.review.findMany.mockResolvedValue([mockReview]);
        const res = buildRes();
 
        await getAllReviewsPark(buildReq({ params: { parkId: "5" } }), res);
 
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith([mockReview]);
    });
 
    it("returns 200 with an empty array when there are no reviews", async () => {
        prisma.review.findMany.mockResolvedValue([]);
        const res = buildRes();
 
        await getAllReviewsPark(buildReq({ params: { parkId: "5" } }), res);
 
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith([]);
    });
 
    it("returns 500 on a database error", async () => {
        prisma.review.findMany.mockRejectedValue(new Error("DB error"));
        const res = buildRes();
 
        await getAllReviewsPark(buildReq({ params: { parkId: "5" } }), res);
 
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
    });
 
    it("does not throw — error is absorbed into the response", async () => {
        prisma.review.findMany.mockRejectedValue(new Error("Timeout"));
 
        await expect(
            getAllReviewsPark(buildReq({ params: { parkId: "5" } }), buildRes())
        ).resolves.not.toThrow();
    });
});
 
describe("addReviewPark", () => {
    afterEach(() => jest.clearAllMocks());
 
    const req = buildReq({
        params: { parkId: "5" },
        body:   { content: "Lovely!", rating: "5" },
        user:   { id: 1 },
    });
 
    describe("404 - park not found", () => {
        it("returns 404 when the park does not exist", async () => {
            prisma.park.findUnique.mockResolvedValue(null);
            const res = buildRes();
 
            await addReviewPark(req, res);
 
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: "Park not found" });
        });
 
        it("does not create a review when the park is not found", async () => {
            prisma.park.findUnique.mockResolvedValue(null);
 
            await addReviewPark(req, buildRes());
 
            expect(prisma.review.create).not.toHaveBeenCalled();
        });
    });
 
    describe("201 - review created", () => {
        beforeEach(() => {
            prisma.park.findUnique.mockResolvedValue(mockPark);
            prisma.review.create.mockResolvedValue(mockReview);
        });
 
        it("creates the review with correct data types", async () => {
            await addReviewPark(req, buildRes());
 
            expect(prisma.review.create).toHaveBeenCalledWith({
                data: {
                    user_id: 1,
                    park_id: 5,
                    content: "Lovely!",
                    rating:  5,
                },
            });
        });
 
        it("coerces string rating to a number", async () => {
            await addReviewPark(req, buildRes());
 
            const { data } = prisma.review.create.mock.calls[0][0];
            expect(typeof data.rating).toBe("number");
        });
 
        it("returns 201 with the created review", async () => {
            const res = buildRes();
 
            await addReviewPark(req, res);
 
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockReview);
        });
    });
 
    describe("500 - database error", () => {
        it("returns 500 when review.create throws", async () => {
            prisma.park.findUnique.mockResolvedValue(mockPark);
            prisma.review.create.mockRejectedValue(new Error("DB error"));
            const res = buildRes();
 
            await addReviewPark(req, res);
 
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
        });
 
        it("does not throw — error is absorbed into the response", async () => {
            prisma.park.findUnique.mockRejectedValue(new Error("Timeout"));
 
            await expect(addReviewPark(req, buildRes())).resolves.not.toThrow();
        });
    });
});
 
describe("getAllReviewsUser", () => {
    afterEach(() => jest.clearAllMocks());
 
    const mockReviewWithPark = { ...mockReview, park: { name: "Cannon Hill Park" } };
 
    it("queries reviews with the correct user_id and includes park name", async () => {
        prisma.review.findMany.mockResolvedValue([mockReviewWithPark]);
 
        await getAllReviewsUser(buildReq({ user: { id: 1 } }), buildRes());
 
        expect(prisma.review.findMany).toHaveBeenCalledWith({
            where:   { user_id: 1 },
            include: { park: { select: { name: true } } },
        });
    });
 
    it("returns 200 with the reviews array", async () => {
        prisma.review.findMany.mockResolvedValue([mockReviewWithPark]);
        const res = buildRes();
 
        await getAllReviewsUser(buildReq({ user: { id: 1 } }), res);
 
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith([mockReviewWithPark]);
    });
 
    it("returns 200 with an empty array when the user has no reviews", async () => {
        prisma.review.findMany.mockResolvedValue([]);
        const res = buildRes();
 
        await getAllReviewsUser(buildReq({ user: { id: 1 } }), res);
 
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith([]);
    });
 
    it("returns 500 on a database error", async () => {
        prisma.review.findMany.mockRejectedValue(new Error("DB error"));
        const res = buildRes();
 
        await getAllReviewsUser(buildReq({ user: { id: 1 } }), res);
 
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
    });
});
 
describe("getReviewById", () => {
    afterEach(() => jest.clearAllMocks());
 
    it("queries with the correct numeric review id", async () => {
        prisma.review.findUnique.mockResolvedValue(mockReview);
 
        await getReviewById(buildReq({ params: { id: "10" } }), buildRes());
 
        expect(prisma.review.findUnique).toHaveBeenCalledWith({ where: { id: 10 } });
    });
 
    it("returns 200 with the review", async () => {
        prisma.review.findUnique.mockResolvedValue(mockReview);
        const res = buildRes();
 
        await getReviewById(buildReq({ params: { id: "10" } }), res);
 
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockReview);
    });
 
    it("returns 404 when the review does not exist", async () => {
        prisma.review.findUnique.mockResolvedValue(null);
        const res = buildRes();
 
        await getReviewById(buildReq({ params: { id: "99" } }), res);
 
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "Unavailable" });
    });
 
    it("returns 500 on a database error", async () => {
        prisma.review.findUnique.mockRejectedValue(new Error("DB error"));
        const res = buildRes();
 
        await getReviewById(buildReq({ params: { id: "10" } }), res);
 
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
    });
});
 
describe("updateReview", () => {
    afterEach(() => jest.clearAllMocks());
 
    const req = buildReq({
        params: { id: "10" },
        body:   { content: "Updated content", rating: 3 },
        user:   { id: 1 },
    });
 
    describe("403 - not the review owner", () => {
        it("returns 403 when the review does not belong to the user", async () => {
            prisma.review.findUnique.mockResolvedValue(null);
            const res = buildRes();
 
            await updateReview(req, res);
 
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "unauthorized" });
        });
 
        it("does not call review.update when ownership check fails", async () => {
            prisma.review.findUnique.mockResolvedValue(null);
 
            await updateReview(req, buildRes());
 
            expect(prisma.review.update).not.toHaveBeenCalled();
        });
    });
 
    describe("200 - successful update", () => {
        it("looks up the review by id AND user_id together", async () => {
            prisma.review.findUnique.mockResolvedValue(mockReview);
            prisma.review.update.mockResolvedValue({ ...mockReview, content: "Updated content" });
 
            await updateReview(req, buildRes());
 
            expect(prisma.review.findUnique).toHaveBeenCalledWith({
                where: { id: 10, user_id: 1 },
            });
        });
 
        it("calls review.update with the correct id and body", async () => {
            prisma.review.findUnique.mockResolvedValue(mockReview);
            prisma.review.update.mockResolvedValue({ ...mockReview, content: "Updated content" });
 
            await updateReview(req, buildRes());
 
            expect(prisma.review.update).toHaveBeenCalledWith({
                where: { id: 10 },
                data:  req.body,
            });
        });
 
        it("returns 200 with a success message", async () => {
            prisma.review.findUnique.mockResolvedValue(mockReview);
            prisma.review.update.mockResolvedValue({ ...mockReview, content: "Updated content" });
            const res = buildRes();
 
            await updateReview(req, res);
 
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: "Updated successfully" });
        });
    });
 
    describe("500 - database error", () => {
        it("returns 500 when review.update throws", async () => {
            prisma.review.findUnique.mockResolvedValue(mockReview);
            prisma.review.update.mockRejectedValue(new Error("DB error"));
            const res = buildRes();
 
            await updateReview(req, res);
 
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
        });
 
        it("does not throw — error is absorbed into the response", async () => {
            prisma.review.findUnique.mockRejectedValue(new Error("Timeout"));
 
            await expect(updateReview(req, buildRes())).resolves.not.toThrow();
        });
    });
});
 
describe("deleteReview", () => {
    afterEach(() => jest.clearAllMocks());
 
    const req = buildReq({ params: { id: "10" }, user: { id: 1 } });
 
    describe("403 - not the review owner", () => {
        it("returns 403 when the review does not belong to the user", async () => {
            prisma.review.findUnique.mockResolvedValue(null);
            const res = buildRes();
 
            await deleteReview(req, res);
 
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "unauthorized" });
        });
 
        it("does not call review.delete when ownership check fails", async () => {
            prisma.review.findUnique.mockResolvedValue(null);
 
            await deleteReview(req, buildRes());
 
            expect(prisma.review.delete).not.toHaveBeenCalled();
        });
    });
 
    describe("204 - successful deletion", () => {
        it("looks up the review by id AND user_id together", async () => {
            prisma.review.findUnique.mockResolvedValue(mockReview);
            prisma.review.delete.mockResolvedValue(mockReview);
 
            await deleteReview(req, buildRes());
 
            expect(prisma.review.findUnique).toHaveBeenCalledWith({
                where: { id: 10, user_id: 1 },
            });
        });
 
        it("deletes the review using the correct id", async () => {
            prisma.review.findUnique.mockResolvedValue(mockReview);
            prisma.review.delete.mockResolvedValue(mockReview);
 
            await deleteReview(req, buildRes());
 
            expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: 10 } });
        });
 
        it("returns 204 status on successful deletion", async () => {
            prisma.review.findUnique.mockResolvedValue(mockReview);
            prisma.review.delete.mockResolvedValue(mockReview);
            const res = buildRes();
 
            await deleteReview(req, res);
 
            expect(res.status).toHaveBeenCalledWith(204);
        });
    });
 
    describe("500 - database error", () => {
        it("returns 500 when review.delete throws", async () => {
            prisma.review.findUnique.mockResolvedValue(mockReview);
            prisma.review.delete.mockRejectedValue(new Error("DB error"));
            const res = buildRes();
 
            await deleteReview(req, res);
 
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
        });
 
        it("does not throw — error is absorbed into the response", async () => {
            prisma.review.findUnique.mockRejectedValue(new Error("Timeout"));
 
            await expect(deleteReview(req, buildRes())).resolves.not.toThrow();
        });
    });
});