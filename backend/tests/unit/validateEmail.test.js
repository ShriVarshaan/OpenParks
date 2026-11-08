import { jest } from "@jest/globals";

const mockOtpFindFirst = jest.fn();
const mockSendVerification = jest.fn();

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: {
    oneTimePasswords: { findFirst: mockOtpFindFirst, update: jest.fn() },
    user: { update: jest.fn() },
  },
}));
jest.unstable_mockModule("../../src/controllers/sendVerification.js", () => ({
  sendVerification: mockSendVerification,
}));

const { checkValidOTP } = await import("../../src/controllers/validateEmail.js");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("validateEmail - checkValidOTP with no active OTP", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOtpFindFirst.mockResolvedValue(null);
  });

  test("sends a new OTP to the email address", async () => {
    mockSendVerification.mockResolvedValue();
    const res = createRes();

    await checkValidOTP({ body: { email: "a@example.com", otp: "x" } }, res);

    expect(mockSendVerification).toHaveBeenCalledWith("a@example.com");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "No active OTP, new OTP sent" });
  });

  test("waits for the new OTP to be sent, so a send failure cannot escape as an unhandled rejection", async () => {
    let settled = false;
    mockSendVerification.mockReturnValue(
      new Promise((resolve) => setTimeout(resolve, 20)).then(() => {
        settled = true;
      })
    );

    await checkValidOTP({ body: { email: "a@example.com", otp: "x" } }, createRes());

    expect(settled).toBe(true);
  });

  test("answers 500 instead of crashing when the new OTP cannot be sent", async () => {
    mockSendVerification.mockRejectedValue(new Error("SMTP down"));
    const res = createRes();

    await checkValidOTP({ body: { email: "a@example.com", otp: "x" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Could not send a new OTP, try again later" });
  });
});
