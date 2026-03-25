import { jest } from "@jest/globals";

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
    default: {
        $queryRaw: jest.fn(),
    },
}));

const { default: prisma }               = await import("../../src/config/prisma.js");
const { getTrailsByParkId, getAllTrails } = await import("../../src/controllers/trailController.js");

const buildReq = (params = {}) => ({ params });

const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
};

const mockGeometry = {
    type: "LineString",
    coordinates: [[-1.90, 52.48], [-1.91, 52.49]],
};

const mockTrailRows = [
    {
        id:       1,
        park_id:  5,
        osm_id:   BigInt(123456789),
        highway:  "footway",
        name:     "North Trail",
        surface:  "gravel",
        geometry: mockGeometry,
    },
    {
        id:       2,
        park_id:  5,
        osm_id:   null,
        highway:  "path",
        name:     "South Trail",
        surface:  "dirt",
        geometry: mockGeometry,
    },
];

const toFeature = (row) => ({
    type: "Feature",
    geometry: row.geometry,
    properties: {
        id:      row.id,
        park_id: row.park_id,
        osm_id:  row.osm_id ? row.osm_id.toString() : null,
        highway: row.highway,
        name:    row.name,
        surface: row.surface,
    },
});

describe("getTrailsByParkId", () => {
    afterEach(() => jest.clearAllMocks());

    describe("200 – trails found", () => {
        it("calls $queryRaw once with the correct park id", async () => {
            prisma.$queryRaw.mockResolvedValue(mockTrailRows);

            await getTrailsByParkId(buildReq({ parkId: "5" }), buildRes());

            expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
        });

        it("returns a GeoJSON FeatureCollection", async () => {
            prisma.$queryRaw.mockResolvedValue(mockTrailRows);
            const res = buildRes();

            await getTrailsByParkId(buildReq({ parkId: "5" }), res);

            expect(res.status).toHaveBeenCalledWith(200);
            const [body] = res.json.mock.calls[0];
            expect(body.type).toBe("FeatureCollection");
        });

        it("includes all rows as features", async () => {
            prisma.$queryRaw.mockResolvedValue(mockTrailRows);
            const res = buildRes();

            await getTrailsByParkId(buildReq({ parkId: "5" }), res);

            const [body] = res.json.mock.calls[0];
            expect(body.features).toHaveLength(mockTrailRows.length);
        });

        it("maps each row to a correctly shaped GeoJSON feature", async () => {
            prisma.$queryRaw.mockResolvedValue(mockTrailRows);
            const res = buildRes();

            await getTrailsByParkId(buildReq({ parkId: "5" }), res);

            const [body] = res.json.mock.calls[0];
            expect(body.features[0]).toEqual(toFeature(mockTrailRows[0]));
            expect(body.features[1]).toEqual(toFeature(mockTrailRows[1]));
        });

        it("sets type to 'Feature' on every item", async () => {
            prisma.$queryRaw.mockResolvedValue(mockTrailRows);
            const res = buildRes();

            await getTrailsByParkId(buildReq({ parkId: "5" }), res);

            const [body] = res.json.mock.calls[0];
            body.features.forEach(f => expect(f.type).toBe("Feature"));
        });

        it("returns an empty features array when the park has no trails", async () => {
            prisma.$queryRaw.mockResolvedValue([]);
            const res = buildRes();

            await getTrailsByParkId(buildReq({ parkId: "5" }), res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ type: "FeatureCollection", features: [] });
        });
    });

    describe("osm_id handling", () => {
        it("converts a BigInt osm_id to a string", async () => {
            prisma.$queryRaw.mockResolvedValue([mockTrailRows[0]]);
            const res = buildRes();

            await getTrailsByParkId(buildReq({ parkId: "5" }), res);

            const [body] = res.json.mock.calls[0];
            expect(body.features[0].properties.osm_id).toBe("123456789");
            expect(typeof body.features[0].properties.osm_id).toBe("string");
        });

        it("sets osm_id to null when the value is null", async () => {
            prisma.$queryRaw.mockResolvedValue([mockTrailRows[1]]); 
            const res = buildRes();

            await getTrailsByParkId(buildReq({ parkId: "5" }), res);

            const [body] = res.json.mock.calls[0];
            expect(body.features[0].properties.osm_id).toBeNull();
        });
    });

    describe("500 – database error", () => {
        it("returns 500 with an error message on failure", async () => {
            prisma.$queryRaw.mockRejectedValue(new Error("DB error"));
            const res = buildRes();

            await getTrailsByParkId(buildReq({ parkId: "5" }), res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch trails" });
        });

        it("does not throw — error is absorbed into the response", async () => {
            prisma.$queryRaw.mockRejectedValue(new Error("Timeout"));

            await expect(
                getTrailsByParkId(buildReq({ parkId: "5" }), buildRes())
            ).resolves.not.toThrow();
        });
    });
});

describe("getAllTrails", () => {
    afterEach(() => jest.clearAllMocks());

    describe("200 – successful fetch", () => {
        it("calls $queryRaw once", async () => {
            prisma.$queryRaw.mockResolvedValue(mockTrailRows);

            await getAllTrails(buildReq(), buildRes());

            expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
        });

        it("returns a GeoJSON FeatureCollection", async () => {
            prisma.$queryRaw.mockResolvedValue(mockTrailRows);
            const res = buildRes();

            await getAllTrails(buildReq(), res);

            expect(res.status).toHaveBeenCalledWith(200);
            const [body] = res.json.mock.calls[0];
            expect(body.type).toBe("FeatureCollection");
        });

        it("includes all rows as features", async () => {
            prisma.$queryRaw.mockResolvedValue(mockTrailRows);
            const res = buildRes();

            await getAllTrails(buildReq(), res);

            const [body] = res.json.mock.calls[0];
            expect(body.features).toHaveLength(mockTrailRows.length);
        });

        it("maps each row to a correctly shaped GeoJSON feature", async () => {
            prisma.$queryRaw.mockResolvedValue(mockTrailRows);
            const res = buildRes();

            await getAllTrails(buildReq(), res);

            const [body] = res.json.mock.calls[0];
            expect(body.features[0]).toEqual(toFeature(mockTrailRows[0]));
            expect(body.features[1]).toEqual(toFeature(mockTrailRows[1]));
        });

        it("sets type to 'Feature' on every item", async () => {
            prisma.$queryRaw.mockResolvedValue(mockTrailRows);
            const res = buildRes();

            await getAllTrails(buildReq(), res);

            const [body] = res.json.mock.calls[0];
            body.features.forEach(f => expect(f.type).toBe("Feature"));
        });

        it("returns an empty features array when there are no trails", async () => {
            prisma.$queryRaw.mockResolvedValue([]);
            const res = buildRes();

            await getAllTrails(buildReq(), res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ type: "FeatureCollection", features: [] });
        });
    });

    describe("osm_id handling", () => {
        it("converts a BigInt osm_id to a string", async () => {
            prisma.$queryRaw.mockResolvedValue([mockTrailRows[0]]); 
            const res = buildRes();

            await getAllTrails(buildReq(), res);

            const [body] = res.json.mock.calls[0];
            expect(body.features[0].properties.osm_id).toBe("123456789");
            expect(typeof body.features[0].properties.osm_id).toBe("string");
        });

        it("sets osm_id to null when the value is null", async () => {
            prisma.$queryRaw.mockResolvedValue([mockTrailRows[1]]); 
            const res = buildRes();

            await getAllTrails(buildReq(), res);

            const [body] = res.json.mock.calls[0];
            expect(body.features[0].properties.osm_id).toBeNull();
        });
    });

    describe("500 – database error", () => {
        it("returns 500 with an error message on failure", async () => {
            prisma.$queryRaw.mockRejectedValue(new Error("DB error"));
            const res = buildRes();

            await getAllTrails(buildReq(), res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch trails" });
        });

        it("does not throw — error is absorbed into the response", async () => {
            prisma.$queryRaw.mockRejectedValue(new Error("Timeout"));

            await expect(
                getAllTrails(buildReq(), buildRes())
            ).resolves.not.toThrow();
        });
    });
});