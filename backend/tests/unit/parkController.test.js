import { jest } from "@jest/globals";

const mockQueryRaw = jest.fn();

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: {
    $queryRaw: mockQueryRaw,
  },
}));

const {
  getAllParks,
  getParkById,
} = await import("../../src/controllers/parkController.js");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("parkController - getAllParks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns all parks as a FeatureCollection", async () => {
    const req = {};
    const res = createRes();

    mockQueryRaw.mockResolvedValue([
      {
        id: 1,
        name: "Central Park",
        geometry: { type: "Point", coordinates: [1, 2] },
      },
      {
        id: 2,
        name: "Hyde Park",
        geometry: { type: "Point", coordinates: [3, 4] },
      },
    ]);

    await getAllParks(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [1, 2] },
          properties: {
            id: 1,
            name: "Central Park",
            mobility_data: undefined,
            maintenance_stats: undefined,
          },
        },
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [3, 4] },
          properties: {
            id: 2,
            name: "Hyde Park",
            mobility_data: undefined,
            maintenance_stats: undefined,
          },
        },
      ],
    });
  });

  test("returns 500 if fetching all parks fails", async () => {
    const req = {};
    const res = createRes();

    mockQueryRaw.mockRejectedValue(new Error("DB failure"));

    await getAllParks(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch parks" });
  });
});

describe("parkController - getParkById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns a single park as a Feature", async () => {
    const req = { params: { id: "1" } };
    const res = createRes();

    mockQueryRaw.mockResolvedValue([
      {
        id: 1,
        name: "Central Park",
        mobility_data: "Wheelchair accessible",
        maintenance_stats: "Good",
        geometry: { type: "Point", coordinates: [1, 2] },
      },
    ]);

    await getParkById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      type: "Feature",
      geometry: { type: "Point", coordinates: [1, 2] },
      properties: {
        id: 1,
        name: "Central Park",
        mobility_data: "Wheelchair accessible",
        maintenance_stats: "Good",
      },
    });
  });

  test("returns 404 if park is not found", async () => {
    const req = { params: { id: "999" } };
    const res = createRes();

    mockQueryRaw.mockResolvedValue([]);

    await getParkById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Park not found" });
  });

  test("returns 500 if fetching park by id fails", async () => {
    const req = { params: { id: "1" } };
    const res = createRes();

    mockQueryRaw.mockRejectedValue(new Error("DB failure"));

    await getParkById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch park" });
  });
});
