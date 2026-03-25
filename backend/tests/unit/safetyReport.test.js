import { jest } from "@jest/globals";

const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockQueryRaw = jest.fn();
const mockExecuteRaw = jest.fn();

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: {
    safetyReport: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
    $queryRaw: mockQueryRaw,
    $executeRaw: mockExecuteRaw,
  },
}));

const {
  getAllReports,
  createNewReport,
  updateReport,
  getUserReports,
  getAllReportsHeatmap
} = await import("../../src/controllers/safetyReport.js");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("safetyReportController - getAllReports", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns all safety reports", async () => {
    const req = { params: { id: "1" } };
    const res = createRes();

    const reports = [{ id: 1, park_id: 1, description: "Broken light" }];
    mockQueryRaw.mockResolvedValue(reports);

    await getAllReports(req, res);

    expect(mockQueryRaw).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(reports);
  });
  test("returns 500 on a database error", async () => {
    const req = { params: { reportname: "hazard" } };
    const res = createRes();

    mockQueryRaw.mockRejectedValue(new Error("DB error"));

    await getAllReports(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
  });
});

describe ("safetyReportController - getUserReports", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("returns 200 and reports for a valid user", async () => {
    const req = { user: { id: "1" } };
    const res = createRes();

    const reports = [
        { id: 1, user_id: 1, park_id: 1, description: "Broken fence", Park: { name: "Hyde Park" } },
        { id: 2, user_id: 1, park_id: 2, description: "Slippery path", Park: { name: "Regent's Park" } },
    ];

    mockFindMany.mockResolvedValue(reports);

    await getUserReports(req, res);

    expect(mockFindMany).toHaveBeenCalledWith({
        where: { user_id: 1, park_id: { not: null } },
        include: { Park: { select: { name: true } } },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(reports);
  });

  test("returns 200 and empty array when user has no reports", async () => {
    const req = { user: { id: "1" } };
    const res = createRes();

    mockFindMany.mockResolvedValue([]);

    await getUserReports(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  test("returns 500 on a database error", async () => {
    const req = { user: { id: "1" } };
    const res = createRes();

    mockFindMany.mockRejectedValue(new Error("DB error"));

    await getUserReports(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
  });
});

describe("safetyReportController - createNewReport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("creates a new safety report", async () => {
    const req = {
      params: { id: "1" },
      body: {
        description: "Broken bench",
        park_id: "1",
        location: { coordinates: [1, 2] },
        heading: "Hazard",
      },
      user: { id: 5 },
    };
    const res = createRes();

    mockExecuteRaw.mockResolvedValue([
      {
        id: 100,
        user_id: 5,
        park_id: 1,
        description: "Broken bench",
      },
    ]);

    await createNewReport(req, res);

    expect(mockExecuteRaw).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      id: 100,
      user_id: 5,
      park_id: 1,
      description: "Broken bench",
    });
  });

  test("returns 500 if creating report fails", async () => {
    const req = {
      params: { id: "1" },
      body: {
        description: "Broken bench",
        park_id: "1",
        location: { coordinates: [1, 2] },
        heading: "Hazard",
      },
      user: { id: 5 },
    };
    const res = createRes();

    mockExecuteRaw.mockRejectedValue(new Error("DB failure"));

    await createNewReport(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Internal server error",
    });
  });
});

describe("safetyReportController - updateReport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 404 if report does not exist", async () => {
    const req = {
      params: { id: "1", reportid: "10" },
      body: { status: "resolved" },
    };
    const res = createRes();

    mockFindUnique.mockResolvedValue(null);

    await updateReport(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "report not found" });
  });

  test("updates report status successfully", async () => {
    const req = {
      params: { id: "1", reportid: "10" },
      body: { status: "resolved" },
    };
    const res = createRes();

    mockFindUnique.mockResolvedValue({ id: 10, park_id: 1 });
    mockUpdate.mockResolvedValue({
      id: 10,
      status: "resolved",
    });

    await updateReport(req, res);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { status: "RESOLVED" },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: 10,
      status: "resolved",
    });
  });

  test("returns 400 for Prisma P2002 error", async () => {
    const req = {
      params: { id: "1", reportid: "10" },
      body: { status: "resolved" },
    };
    const res = createRes();

    mockFindUnique.mockResolvedValue({ id: 10, park_id: 1 });
    const error = new Error("Prisma error");
    error.code = "P2002";
    mockUpdate.mockRejectedValue(error);

    await updateReport(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid error code" });
  });

  test("returns 500 for other update errors", async () => {
    const req = {
      params: { id: "1", reportid: "10" },
      body: { status: "resolved" },
    };
    const res = createRes();

    mockFindUnique.mockResolvedValue({ id: 10, park_id: 1 });
    mockUpdate.mockRejectedValue(new Error("Unknown error"));

    await updateReport(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Server error" });
  });
});

describe("safetyReportController - getAllReportsHeatmap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 200 and reports for heatmap", async () => {
    const req = {};
    const res = createRes();

    const reports = [
        { id: 1, heading: "hazard", location: { type: "Point", coordinates: [-0.1276, 51.5074] } },
        { id: 2, heading: "vandalism", location: { type: "Point", coordinates: [-0.0922, 51.5152] } },
    ];

    mockQueryRaw.mockResolvedValue(reports);

    await getAllReportsHeatmap(req, res);

    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(reports);
  });

  test("returns 200 and empty array when no open reports exist", async () => {
    const req = {};
    const res = createRes();

    mockQueryRaw.mockResolvedValue([]);

    await getAllReportsHeatmap(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  test("returns 500 on a database error", async () => {
    const req = {};
    const res = createRes();

    mockQueryRaw.mockRejectedValue(new Error("DB error"));

    await getAllReportsHeatmap(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
  });
});