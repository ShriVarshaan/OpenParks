import { jest } from "@jest/globals";

const mockFindMany = jest.fn();

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: {
    parkAmenity: {
      findMany: mockFindMany,
    },
  },
}));

const { getAmenities } = await import("../../src/controllers/amenityController.js");

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
});

