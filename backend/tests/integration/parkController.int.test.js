import { jest } from "@jest/globals";

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
    default: {
        $queryRaw: jest.fn(),
    },
}));

const { default: prisma } = await import("../../src/config/prisma.js");
const { getAllParks, getParkById } = await import("../../src/controllers/parkController.js");

const buildReq = (params = {}) => ({ params });

const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
};

const mockGeometry = { type: "Point", coordinates: [-1.9, 52.48] };

const mockParkRows = [
    {
        id: 1,
        name: "Cannon Hill Park",
        geometry: mockGeometry,
        mobility_data: { accessible: true },
        maintenance_stats: { last_checked: "2024-01-01" },
        distance: null,
    },
    {
        id: 2,
        name: "Sutton Park",
        geometry: mockGeometry,
        mobility_data: { accessible: false },
        maintenance_stats: { last_checked: "2024-02-01" },
        distance: 1.4,
    },
];

const toFeature = (row) => ({
    type: "Feature",
    geometry: row.geometry,
    properties: {
        id: row.id,
        name: row.name,
        mobility_data: row.mobility_data,
        maintenance_stats: row.maintenance_stats,
        ...(row.distance && { distance: row.distance }),
    },
});

describe("getAllParks", () => {
    afterEach(() => jest.clearAllMocks());

    describe("200 - successful fetch", () => {
        it("returns a GeoJSON FeatureCollection", async () => {
            prisma.$queryRaw.mockResolvedValue(mockParkRows);
            const res = buildRes();

            await getAllParks(buildReq(), res);

            expect(res.status).toHaveBeenCalledWith(200);
            const [body] = res.json.mock.calls[0];
            expect(body.type).toBe("FeatureCollection");
        });

        it("includes all rows as features", async () => {
            prisma.$queryRaw.mockResolvedValue(mockParkRows);
            const res = buildRes();

            await getAllParks(buildReq(), res);

            const [body] = res.json.mock.calls[0];
            expect(body.features).toHaveLength(mockParkRows.length);
        });

        it("maps each row to a correctly shaped GeoJSON feature", async () => {
            prisma.$queryRaw.mockResolvedValue(mockParkRows);
            const res = buildRes();

            await getAllParks(buildReq(), res);

            const [body] = res.json.mock.calls[0];
            expect(body.features[0]).toEqual(toFeature(mockParkRows[0]));
            expect(body.features[1]).toEqual(toFeature(mockParkRows[1]));
        });

        it("sets type to 'Feature' on every item", async () => {
            prisma.$queryRaw.mockResolvedValue(mockParkRows);
            const res = buildRes();

            await getAllParks(buildReq(), res);

            const [body] = res.json.mock.calls[0];
            body.features.forEach(f => expect(f.type).toBe("Feature"));
        });

        it("returns an empty features array when no parks exist", async () => {
            prisma.$queryRaw.mockResolvedValue([]);
            const res = buildRes();

            await getAllParks(buildReq(), res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ type: "FeatureCollection", features: [] });
        });
    });

    describe("distance property - conditional inclusion", () => {
        it("omits distance from properties when the value is null", async () => {
            prisma.$queryRaw.mockResolvedValue([mockParkRows[0]]); 
            const res = buildRes();

            await getAllParks(buildReq(), res);

            const [body] = res.json.mock.calls[0];
            expect(body.features[0].properties).not.toHaveProperty("distance");
        });

        it("includes distance in properties when a value is present", async () => {
            prisma.$queryRaw.mockResolvedValue([mockParkRows[1]]); 
            const res = buildRes();

            await getAllParks(buildReq(), res);

            const [body] = res.json.mock.calls[0];
            expect(body.features[0].properties.distance).toBe(1.4);
        });
    });

    describe("500 - database error", () => {
        it("returns 500 with an error message on failure", async () => {
            prisma.$queryRaw.mockRejectedValue(new Error("DB error"));
            const res = buildRes();

            await getAllParks(buildReq(), res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch parks" });
        });

        it("does not throw — error is absorbed into the response", async () => {
            prisma.$queryRaw.mockRejectedValue(new Error("Timeout"));

            await expect(getAllParks(buildReq(), buildRes())).resolves.not.toThrow();
        });
    });
});

describe("getParkById", () => {
    afterEach(() => jest.clearAllMocks());

    describe("200 - park found", () => {
        it("returns 200 with a correctly shaped GeoJSON feature", async () => {
            prisma.$queryRaw.mockResolvedValue([mockParkRows[0]]);
            const res = buildRes();

            await getParkById(buildReq({ id: "1" }), res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(toFeature(mockParkRows[0]));
        });

        it("calls $queryRaw once with the park id", async () => {
            prisma.$queryRaw.mockResolvedValue([mockParkRows[0]]);

            await getParkById(buildReq({ id: "1" }), buildRes());

            expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
        });

        it("sets type to 'Feature' on the returned object", async () => {
            prisma.$queryRaw.mockResolvedValue([mockParkRows[0]]);
            const res = buildRes();

            await getParkById(buildReq({ id: "1" }), res);

            const [body] = res.json.mock.calls[0];
            expect(body.type).toBe("Feature");
        });

        it("includes mobility_data and maintenance_stats in properties", async () => {
            prisma.$queryRaw.mockResolvedValue([mockParkRows[0]]);
            const res = buildRes();

            await getParkById(buildReq({ id: "1" }), res);

            const [body] = res.json.mock.calls[0];
            expect(body.properties.mobility_data).toEqual(mockParkRows[0].mobility_data);
            expect(body.properties.maintenance_stats).toEqual(mockParkRows[0].maintenance_stats);
        });
    });

    describe("distance property - conditional inclusion", () => {
        it("omits distance from properties when the value is null", async () => {
            prisma.$queryRaw.mockResolvedValue([mockParkRows[0]]); 
            const res = buildRes();

            await getParkById(buildReq({ id: "1" }), res);

            const [body] = res.json.mock.calls[0];
            expect(body.properties).not.toHaveProperty("distance");
        });

        it("includes distance in properties when a value is present", async () => {
            prisma.$queryRaw.mockResolvedValue([mockParkRows[1]]); 
            const res = buildRes();

            await getParkById(buildReq({ id: "2" }), res);

            const [body] = res.json.mock.calls[0];
            expect(body.properties.distance).toBe(1.4);
        });
    });

    describe("404 - park not found", () => {
        it("returns 404 when the query returns an empty array", async () => {
            prisma.$queryRaw.mockResolvedValue([]);
            const res = buildRes();

            await getParkById(buildReq({ id: "99" }), res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: "Park not found" });
        });

        it("returns 404 when destructuring yields undefined", async () => {
            prisma.$queryRaw.mockResolvedValue([undefined]);
            const res = buildRes();

            await getParkById(buildReq({ id: "99" }), res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe("500 - database error", () => {
        it("returns 500 with an error message on failure", async () => {
            prisma.$queryRaw.mockRejectedValue(new Error("DB crash"));
            const res = buildRes();

            await getParkById(buildReq({ id: "1" }), res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch park" });
        });

        it("does not throw — error is absorbed into the response", async () => {
            prisma.$queryRaw.mockRejectedValue(new Error("Timeout"));

            await expect(getParkById(buildReq({ id: "1" }), buildRes())).resolves.not.toThrow();
        });
    });
});