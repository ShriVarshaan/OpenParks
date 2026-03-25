import { jest } from "@jest/globals";

const mockQueryRaw = jest.fn();

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: {
    $queryRaw: mockQueryRaw,
  },
}));

const { getTrailsByParkId, getAllTrails } = await import("../../src/controllers/trailController.js");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockTrailRows = [
  {
    id: 1,
    park_id: 1,
    osm_id: BigInt(123456),
    highway: "footway",
    name: "Nature Trail",
    surface: "gravel",
    geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
  },
  {
    id: 2,
    park_id: 1,
    osm_id: null,
    highway: "path",
    name: "River Walk",
    surface: "dirt",
    geometry: { type: "LineString", coordinates: [[2, 2], [3, 3]] },
  },
];

const expectedFeatures = [
  {
    type: "Feature",
    geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
    properties: {
      id: 1,
      park_id: 1,
      osm_id: "123456",
      highway: "footway",
      name: "Nature Trail",
      surface: "gravel",
    },
  },
  {
    type: "Feature",
    geometry: { type: "LineString", coordinates: [[2, 2], [3, 3]] },
    properties: {
      id: 2,
      park_id: 1,
      osm_id: null,
      highway: "path",
      name: "River Walk",
      surface: "dirt",
    },
  },
];

// ─── getTrailsByParkId ───────────────────────────────────────────────────────

describe("trailController - getTrailsByParkId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns a FeatureCollection for a valid park id", async () => {
    const req = { params: { parkId: "1" } };
    const res = createRes();

    mockQueryRaw.mockResolvedValue(mockTrailRows);

    await getTrailsByParkId(req, res);

    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      type: "FeatureCollection",
      features: expectedFeatures,
    });
  });

  test("returns an empty FeatureCollection when no trails exist for park", async () => {
    const req = { params: { parkId: "99" } };
    const res = createRes();

    mockQueryRaw.mockResolvedValue([]);

    await getTrailsByParkId(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      type: "FeatureCollection",
      features: [],
    });
  });

  test("returns 500 on a database error", async () => {
    const req = { params: { parkId: "1" } };
    const res = createRes();

    mockQueryRaw.mockRejectedValue(new Error("DB error"));

    await getTrailsByParkId(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch trails" });
  });
});

// ─── getAllTrails ────────────────────────────────────────────────────────────

describe("trailController - getAllTrails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns a FeatureCollection of all trails", async () => {
    const req = {};
    const res = createRes();

    mockQueryRaw.mockResolvedValue(mockTrailRows);

    await getAllTrails(req, res);

    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      type: "FeatureCollection",
      features: expectedFeatures,
    });
  });

  test("returns an empty FeatureCollection when no trails exist", async () => {
    const req = {};
    const res = createRes();

    mockQueryRaw.mockResolvedValue([]);

    await getAllTrails(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      type: "FeatureCollection",
      features: [],
    });
  });

  test("returns 500 on a database error", async () => {
    const req = {};
    const res = createRes();

    mockQueryRaw.mockRejectedValue(new Error("DB error"));

    await getAllTrails(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch trails" });
  });
});