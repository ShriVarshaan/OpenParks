import { jest } from "@jest/globals";
 
jest.unstable_mockModule("../../src/config/prisma.js", () => ({
    default: {
        parkAmenity: {
            findMany: jest.fn(),
        },
        $queryRaw: jest.fn(),
    },
}));
 
const { default: prisma } = await import("../../src/config/prisma.js");
const { getAmenities, getAllAmenities } = await import("../../src/controllers/amenityController.js");
 
const buildReq = (params = {}) => ({ params });
 
const buildRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};
 
const mockAmenityRows = [
    { id: 1, park_id: 10, name: "Bench", lng: -0.1278, lat: 51.5074, amenity: "bench"    },
    { id: 2, park_id: 10, name: "Water Tap", lng: -0.1300, lat: 51.5080, amenity: "drinking_water" },
];

describe("getAmenities", () => {
    afterEach(() => jest.clearAllMocks());
 
    describe("200 - amenities found", () => {
        it("queries prisma with the correct numeric park_id", async () => {
            prisma.parkAmenity.findMany.mockResolvedValue(mockAmenityRows);
 
            await getAmenities(buildReq({ id: "10" }), buildRes());
 
            expect(prisma.parkAmenity.findMany).toHaveBeenCalledTimes(1);
            expect(prisma.parkAmenity.findMany).toHaveBeenCalledWith({
                where: { park_id: 10 },
            });
        });
 
        it("returns 200 with the amenities array", async () => {
            prisma.parkAmenity.findMany.mockResolvedValue(mockAmenityRows);
            const res = buildRes();
 
            await getAmenities(buildReq({ id: "10" }), res);
 
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockAmenityRows);
        });
 
        it("returns 200 with an empty array when the park has no amenities", async () => {
            prisma.parkAmenity.findMany.mockResolvedValue([]);
            const res = buildRes();
 
            await getAmenities(buildReq({ id: "10" }), res);
 
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([]);
        });
    });
 
    describe("500 - database error", () => {
        it("returns 500 with a generic message on failure", async () => {
            prisma.parkAmenity.findMany.mockRejectedValue(new Error("DB error"));
            const res = buildRes();
 
            await getAmenities(buildReq({ id: "10" }), res);
 
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
        });
 
        it("does not throw — error is absorbed into the response", async () => {
            prisma.parkAmenity.findMany.mockRejectedValue(new Error("Timeout"));
            const res = buildRes();
 
            await expect(getAmenities(buildReq({ id: "10" }), res)).resolves.not.toThrow();
        });
    });
 
    describe("id coercion", () => {
        it("converts a string id param to a number", async () => {
            prisma.parkAmenity.findMany.mockResolvedValue([]);
 
            await getAmenities(buildReq({ id: "42" }), buildRes());
 
            expect(prisma.parkAmenity.findMany).toHaveBeenCalledWith({
                where: { park_id: 42 },
            });
        });
    });
});
 
describe("getAllAmenities", () => {
    afterEach(() => jest.clearAllMocks());
 
    describe("200 - GeoJSON transformation", () => {
        it("returns 200 with a correctly shaped GeoJSON feature array", async () => {
            prisma.$queryRaw.mockResolvedValue(mockAmenityRows);
            const res = buildRes();
 
            await getAllAmenities(buildReq(), res);
 
            expect(res.status).toHaveBeenCalledWith(200);
 
            const [geojson] = res.json.mock.calls[0];
            expect(geojson).toHaveLength(mockAmenityRows.length);
        });
 
        it("sets type to 'Feature' on every item", async () => {
            prisma.$queryRaw.mockResolvedValue(mockAmenityRows);
            const res = buildRes();
 
            await getAllAmenities(buildReq(), res);
 
            const [geojson] = res.json.mock.calls[0];
            geojson.forEach(feature => expect(feature.type).toBe("Feature"));
        });
 
        it("maps lng/lat into a Point geometry", async () => {
            prisma.$queryRaw.mockResolvedValue(mockAmenityRows);
            const res = buildRes();
 
            await getAllAmenities(buildReq(), res);
 
            const [geojson] = res.json.mock.calls[0];
 
            expect(geojson[0].geometry).toEqual({
                type: "Point",
                coordinates: [mockAmenityRows[0].lng, mockAmenityRows[0].lat],
            });
 
            expect(geojson[1].geometry).toEqual({
                type: "Point",
                coordinates: [mockAmenityRows[1].lng, mockAmenityRows[1].lat],
            });
        });
 
        it("maps id, park_id, name, and amenity into properties", async () => {
            prisma.$queryRaw.mockResolvedValue(mockAmenityRows);
            const res = buildRes();
 
            await getAllAmenities(buildReq(), res);
 
            const [geojson] = res.json.mock.calls[0];
 
            expect(geojson[0].properties).toEqual({
                id:      mockAmenityRows[0].id,
                park_id: mockAmenityRows[0].park_id,
                name:    mockAmenityRows[0].name,
                amenity: mockAmenityRows[0].amenity,
            });
        });
 
        it("returns an empty array when there are no amenities", async () => {
            prisma.$queryRaw.mockResolvedValue([]);
            const res = buildRes();
 
            await getAllAmenities(buildReq(), res);
 
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([]);
        });
    });
 
    describe("coordinate ordering", () => {
        it("places lng before lat in the coordinates array (GeoJSON spec)", async () => {
            const row = [{ id: 3, park_id: 5, name: "Bin", lng: -1.5, lat: 53.8, amenity: "waste_basket" }];
            prisma.$queryRaw.mockResolvedValue(row);
            const res = buildRes();
 
            await getAllAmenities(buildReq(), res);
 
            const [geojson] = res.json.mock.calls[0];
            const [lng, lat] = geojson[0].geometry.coordinates;
 
            expect(lng).toBe(-1.5);
            expect(lat).toBe(53.8);
        });
    });
 
    describe("500 - database error", () => {
        it("returns 500 with a generic message on failure", async () => {
            prisma.$queryRaw.mockRejectedValue(new Error("Raw query failed"));
            const res = buildRes();
 
            await getAllAmenities(buildReq(), res);
 
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
        });
 
        it("does not throw — error is absorbed into the response", async () => {
            prisma.$queryRaw.mockRejectedValue(new Error("Timeout"));
            const res = buildRes();
 
            await expect(getAllAmenities(buildReq(), res)).resolves.not.toThrow();
        });
    });
});