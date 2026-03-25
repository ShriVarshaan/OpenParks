import { jest } from "@jest/globals";

const mockFindMany = jest.fn();
const mockQueryRaw = jest.fn()

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: {
    parkAmenity: {
      findMany: mockFindMany,
    },
    $queryRaw: mockQueryRaw,
  },
}));

const { getAmenities,  getAllAmenities } = await import("../../src/controllers/amenityController.js");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("amenityController - getAmenities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns amenities for a valid park id", async () => {
    const req = { params: { id: "1" } };
    const res = createRes();

    const amenities = [
      { id: 1, park_id: 1, name: "Toilet" },
      { id: 2, park_id: 1, name: "Parking" },
    ];

    mockFindMany.mockResolvedValue(amenities);

    await getAmenities(req, res);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { park_id: 1 },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(amenities);
  });

  test("handles empty amenities list", async () => {
    const req = { params: { id: "2" } };
    const res = createRes();

    mockFindMany.mockResolvedValue([]);

    await getAmenities(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  test("returns 500 on a database error", async () => {
    const req = { params: { id: "1" } };
    const res = createRes();

    mockFindMany.mockRejectedValue(new Error("DB error"));

    await getAmenities(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
  });
});


describe("amenityController - getAllAmenities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRows = [
    { id: 1, park_id: 1, name: "Toilet", amenity: "toilets", lng: -0.1276, lat: 51.5074 },
    { id: 2, park_id: 2, name: "Bench", amenity: "bench", lng: -0.0922, lat: 51.5152 },
  ];

  const expectedGeoJSON = [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-0.1276, 51.5074] },
      properties: { id: 1, park_id: 1, name: "Toilet", amenity: "toilets" },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-0.0922, 51.5152] },
      properties: { id: 2, park_id: 2, name: "Bench", amenity: "bench" },
    },
  ];

  test("returns 200 and a GeoJSON FeatureCollection array", async () => {
    const req = {};
    const res = createRes();

    mockQueryRaw.mockResolvedValue(mockRows);

    await getAllAmenities(req, res);

    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expectedGeoJSON);
  });

  test("returns 200 and empty array when no amenities exist", async () => {
    const req = {};
    const res = createRes();

    mockQueryRaw.mockResolvedValue([]);

    await getAllAmenities(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  test("returns 500 on a database error", async () => {
    const req = {};
    const res = createRes();

    mockQueryRaw.mockRejectedValue(new Error("DB error"));

    await getAllAmenities(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
  });
});