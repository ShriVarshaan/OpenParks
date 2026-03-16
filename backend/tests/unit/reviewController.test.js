import { jest } from "@jest/globals";

const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: {
    review: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    },
    park: {
      findUnique: mockFindUnique,
    },
  },
}));

const {
  getAllReviewsPark,
  addReviewPark,
  getAllReviewsUser,
  getReviewById,
  updateReview,
  deleteReview,
} = await import("../../src/controllers/reviewController.js");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("reviewController - getAllReviewsPark", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns all reviews for a park", async () => {
    const req = { params: { parkId: "1" } };
    const res = createRes();

    const reviews = [{ id: 1, park_id: 1, content: "Great park" }];
    mockFindMany.mockResolvedValue(reviews);

    await getAllReviewsPark(req, res);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { park_id: 1 },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(reviews);
  });
});

describe("reviewController - addReviewPark", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 404 if park does not exist", async () => {
    const req = {
      params: { id: "1" },
      body: { content: "Nice", rating: "5" },
      user: { id: 10 },
    };
    const res = createRes();

    mockFindUnique.mockResolvedValue(null);

    await addReviewPark(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Park not found" });
  });

  test("creates a review for a valid park", async () => {
    const req = {
      params: { id: "1" },
      body: { content: "Nice park", rating: "5" },
      user: { id: 10 },
    };
    const res = createRes();

    mockFindUnique.mockResolvedValue({ id: 1, name: "Park" });
    mockCreate.mockResolvedValue({
      id: 1,
      user_id: 10,
      park_id: 1,
      content: "Nice park",
      rating: 5,
    });

    await addReviewPark(req, res);

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        user_id: 10,
        park_id: 1,
        content: "Nice park",
        rating: 5,
      },
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      id: 1,
      user_id: 10,
      park_id: 1,
      content: "Nice park",
      rating: 5,
    });
  });

  test("returns 400 if create review throws", async () => {
    const req = {
      params: { id: "1" },
      body: { content: "Nice park", rating: "5" },
      user: { id: 10 },
    };
    const res = createRes();

    mockFindUnique.mockResolvedValue({ id: 1 });
    mockCreate.mockRejectedValue(new Error("Create failed"));

    await addReviewPark(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
  });
});

describe("reviewController - getAllReviewsUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns all reviews for the logged in user", async () => {
    const req = { user: { id: 10 } };
    const res = createRes();

    const reviews = [{ id: 1, user_id: 10, content: "Review" }];
    mockFindMany.mockResolvedValue(reviews);

    await getAllReviewsUser(req, res);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { user_id: 10 },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(reviews);
  });
});

describe("reviewController - getReviewById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 404 if review does not exist", async () => {
    const req = { params: { id: "99" } };
    const res = createRes();

    mockFindUnique.mockResolvedValue(null);

    await getReviewById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Unavailable" });
  });

  test("returns a review if found", async () => {
    const req = { params: { id: "1" } };
    const res = createRes();

    const review = { id: 1, content: "Good" };
    mockFindUnique.mockResolvedValue(review);

    await getReviewById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(review);
  });
});

describe("reviewController - updateReview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 403 if user is not authorized", async () => {
    const req = {
      params: { id: "1" },
      user: { id: 10 },
      body: { content: "Updated" },
    };
    const res = createRes();

    mockFindUnique.mockResolvedValue(null);

    await updateReview(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "unauthorized" });
  });

  test("updates review if user is authorized", async () => {
    const req = {
      params: { id: "1" },
      user: { id: 10 },
      body: { content: "Updated review" },
    };
    const res = createRes();

    mockFindUnique.mockResolvedValue({ id: 1, user_id: 10 });
    mockUpdate.mockResolvedValue({ id: 1, content: "Updated review" });

    await updateReview(req, res);

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { content: "Updated review" },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Updated successfully" });
  });
});

describe("reviewController - deleteReview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 403 if user is not authorized to delete", async () => {
    const req = {
      params: { id: "1" },
      user: { id: 10 },
    };
    const res = createRes();

    mockFindUnique.mockResolvedValue(null);

    await deleteReview(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "unauthorized" });
  });

  test("deletes review if authorized", async () => {
    const req = {
      params: { id: "1" },
      user: { id: 10 },
    };
    const res = createRes();

    mockFindUnique.mockResolvedValue({ id: 1, user_id: 10 });
    mockDelete.mockResolvedValue({});

    await deleteReview(req, res);

    expect(mockDelete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
