import { jest } from "@jest/globals";

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
    default: {
        $queryRaw:    jest.fn(),
        $executeRaw:  jest.fn(),
        safetyReport: {
            findMany:   jest.fn(),
            findUnique: jest.fn(),
            update:     jest.fn(),
        },
    },
}));

const { default: prisma } = await import("../../src/config/prisma.js");
const {
    getAllReports,
    getUserReports,
    createNewReport,
    updateReport,
    getAllReportsHeatmap,
} = await import("../../src/controllers/safetyReport.js");

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

const mockReport = {
    id:          1,
    user_id:     1,
    park_id:     5,
    description: "Broken bench",
    image:       null,
    status:      "OPEN",
    heading:     "HAZARD",
    created_at:  new Date("2024-01-01"),
    location:    { type: "Point", coordinates: [-1.9, 52.48] },
};

const mockReportWithPark = {
    ...mockReport,
    Park: { name: "Cannon Hill Park" },
};

describe("getAllReports", () => {
    afterEach(() => jest.clearAllMocks());

    it("calls $queryRaw once with the correct report heading", async () => {
        prisma.$queryRaw.mockResolvedValue([mockReport]);

        await getAllReports(buildReq({ params: { reportname: "HAZARD" } }), buildRes());

        expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("returns 200 with the reports array", async () => {
        prisma.$queryRaw.mockResolvedValue([mockReport]);
        const res = buildRes();

        await getAllReports(buildReq({ params: { reportname: "HAZARD" } }), res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith([mockReport]);
    });

    it("returns 200 with an empty array when no reports match", async () => {
        prisma.$queryRaw.mockResolvedValue([]);
        const res = buildRes();

        await getAllReports(buildReq({ params: { reportname: "HAZARD" } }), res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith([]);
    });

    it("returns 500 on a database error", async () => {
        prisma.$queryRaw.mockRejectedValue(new Error("DB error"));
        const res = buildRes();

        await getAllReports(buildReq({ params: { reportname: "HAZARD" } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
    });

    it("does not throw — error is absorbed into the response", async () => {
        prisma.$queryRaw.mockRejectedValue(new Error("Timeout"));

        await expect(
            getAllReports(buildReq({ params: { reportname: "HAZARD" } }), buildRes())
        ).resolves.not.toThrow();
    });
});

describe("getUserReports", () => {
    afterEach(() => jest.clearAllMocks());

    it("queries with the correct user_id, non-null park_id filter, and park name include", async () => {
        prisma.safetyReport.findMany.mockResolvedValue([mockReportWithPark]);

        await getUserReports(buildReq({ user: { id: "1" } }), buildRes());

        expect(prisma.safetyReport.findMany).toHaveBeenCalledWith({
            where:   { user_id: 1, park_id: { not: null } },
            include: { Park: { select: { name: true } } },
        });
    });

    it("coerces user id from string to number", async () => {
        prisma.safetyReport.findMany.mockResolvedValue([]);

        await getUserReports(buildReq({ user: { id: "42" } }), buildRes());

        const { where } = prisma.safetyReport.findMany.mock.calls[0][0];
        expect(where.user_id).toBe(42);
        expect(typeof where.user_id).toBe("number");
    });

    it("returns 200 with the reports array", async () => {
        prisma.safetyReport.findMany.mockResolvedValue([mockReportWithPark]);
        const res = buildRes();

        await getUserReports(buildReq({ user: { id: 1 } }), res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith([mockReportWithPark]);
    });

    it("returns 200 with an empty array when the user has no reports", async () => {
        prisma.safetyReport.findMany.mockResolvedValue([]);
        const res = buildRes();

        await getUserReports(buildReq({ user: { id: 1 } }), res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith([]);
    });

    it("returns 500 on a database error", async () => {
        prisma.safetyReport.findMany.mockRejectedValue(new Error("DB error"));
        const res = buildRes();

        await getUserReports(buildReq({ user: { id: 1 } }), res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
    });

    it("does not throw — error is absorbed into the response", async () => {
        prisma.safetyReport.findMany.mockRejectedValue(new Error("Timeout"));

        await expect(
            getUserReports(buildReq({ user: { id: 1 } }), buildRes())
        ).resolves.not.toThrow();
    });
});

describe("createNewReport", () => {
    afterEach(() => jest.clearAllMocks());

    const req = buildReq({
        user: { id: "1" },
        body: {
            park_id:     "5",
            description: "Broken bench",
            heading:     "HAZARD",
            location:    { coordinates: [-1.9, 52.48] },
        },
    });

    describe("201 – report created", () => {
        it("calls $executeRaw once", async () => {
            prisma.$executeRaw.mockResolvedValue([mockReport]);
            const res = buildRes();

            await createNewReport(req, res);

            expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
        });

        it("returns 201 with the first element of the result", async () => {
            prisma.$executeRaw.mockResolvedValue([mockReport]);
            const res = buildRes();

            await createNewReport(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockReport);
        });

        it("returns 201 with undefined when $executeRaw returns an empty array", async () => {
            prisma.$executeRaw.mockResolvedValue([]);
            const res = buildRes();

            await createNewReport(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(undefined);
        });
    });

    describe("coordinate destructuring", () => {
        it("extracts lng and lat from body.location.coordinates", async () => {
            prisma.$executeRaw.mockResolvedValue([mockReport]);

            await expect(createNewReport(req, buildRes())).resolves.not.toThrow();
            expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
        });
    });

    describe("500 – database error", () => {
        it("returns 500 on a $executeRaw failure", async () => {
            prisma.$executeRaw.mockRejectedValue(new Error("Insert failed"));
            const res = buildRes();

            await createNewReport(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
        });

        it("does not throw — error is absorbed into the response", async () => {
            prisma.$executeRaw.mockRejectedValue(new Error("Timeout"));

            await expect(createNewReport(req, buildRes())).resolves.not.toThrow();
        });
    });
});

describe("updateReport", () => {
    afterEach(() => jest.clearAllMocks());

    const req = buildReq({ params: { reportid: "1" } });

    describe("404 – report not found", () => {
        it("returns 404 when no report matches the id", async () => {
            prisma.safetyReport.findUnique.mockResolvedValue(null);
            const res = buildRes();

            await updateReport(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: "report not found" });
        });

        it("does not call safetyReport.update when report is not found", async () => {
            prisma.safetyReport.findUnique.mockResolvedValue(null);

            await updateReport(req, buildRes());

            expect(prisma.safetyReport.update).not.toHaveBeenCalled();
        });
    });

    describe("200 – successful update", () => {
        const resolvedReport = { ...mockReport, status: "RESOLVED" };

        it("looks up the report by the correct numeric id", async () => {
            prisma.safetyReport.findUnique.mockResolvedValue(mockReport);
            prisma.safetyReport.update.mockResolvedValue(resolvedReport);

            await updateReport(req, buildRes());

            expect(prisma.safetyReport.findUnique).toHaveBeenCalledWith({
                where: { id: 1 },
            });
        });

        it("updates status to RESOLVED using the correct id", async () => {
            prisma.safetyReport.findUnique.mockResolvedValue(mockReport);
            prisma.safetyReport.update.mockResolvedValue(resolvedReport);

            await updateReport(req, buildRes());

            expect(prisma.safetyReport.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data:  { status: "RESOLVED" },
            });
        });

        it("returns 200 with the updated report", async () => {
            prisma.safetyReport.findUnique.mockResolvedValue(mockReport);
            prisma.safetyReport.update.mockResolvedValue(resolvedReport);
            const res = buildRes();

            await updateReport(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(resolvedReport);
        });
    });

    describe("400 – Prisma unique constraint error (P2002)", () => {
        it("returns 400 for a P2002 error code", async () => {
            prisma.safetyReport.findUnique.mockResolvedValue(mockReport);
            const prismaError = Object.assign(new Error("Unique constraint"), { code: "P2002" });
            prisma.safetyReport.update.mockRejectedValue(prismaError);
            const res = buildRes();

            await updateReport(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: "Invalid error code" });
        });
    });

    describe("500 – generic database error", () => {
        it("returns 500 for non-P2002 errors", async () => {
            prisma.safetyReport.findUnique.mockResolvedValue(mockReport);
            prisma.safetyReport.update.mockRejectedValue(new Error("DB crash"));
            const res = buildRes();

            await updateReport(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: "Server error" });
        });

        it("does not throw — error is absorbed into the response", async () => {
            prisma.safetyReport.findUnique.mockRejectedValue(new Error("Timeout"));

            await expect(updateReport(req, buildRes())).resolves.not.toThrow();
        });
    });
});

describe("getAllReportsHeatmap", () => {
    afterEach(() => jest.clearAllMocks());

    it("calls $queryRaw once", async () => {
        prisma.$queryRaw.mockResolvedValue([mockReport]);

        await getAllReportsHeatmap(buildReq(), buildRes());

        expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("returns 200 with the reports array", async () => {
        prisma.$queryRaw.mockResolvedValue([mockReport]);
        const res = buildRes();

        await getAllReportsHeatmap(buildReq(), res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith([mockReport]);
    });

    it("returns 200 with an empty array when no open reports exist", async () => {
        prisma.$queryRaw.mockResolvedValue([]);
        const res = buildRes();

        await getAllReportsHeatmap(buildReq(), res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith([]);
    });

    it("returns 500 on a database error", async () => {
        prisma.$queryRaw.mockRejectedValue(new Error("DB error"));
        const res = buildRes();

        await getAllReportsHeatmap(buildReq(), res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
    });

    it("does not throw — error is absorbed into the response", async () => {
        prisma.$queryRaw.mockRejectedValue(new Error("Timeout"));

        await expect(
            getAllReportsHeatmap(buildReq(), buildRes())
        ).resolves.not.toThrow();
    });
});