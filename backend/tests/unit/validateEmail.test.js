import { jest } from "@jest/globals";

const mockOtpFindFirst = jest.fn();
const mockUserFindUnique = jest.fn();
const mockSendVerification = jest.fn();

jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: {
    oneTimePasswords: { findFirst: mockOtpFindFirst, update: jest.fn() },
    user: { update: jest.fn(), findUnique: mockUserFindUnique },
  },
}));
jest.unstable_mockModule("../../src/controllers/sendVerification.js", () => ({
  sendVerification: mockSendVerification,
}));

const { checkValidOTP, resendOtp } = await import("../../src/controllers/validateEmail.js");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const unverifiedUser = { id: 1, email: "a@example.com", Verified: false };
const verifiedUser = { ...unverifiedUser, Verified: true };
const COOLDOWN = { message: "Please wait a minute before requesting another code" };

describe("validateEmail - checkValidOTP with no active OTP", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOtpFindFirst.mockResolvedValue(null);
    mockUserFindUnique.mockResolvedValue(unverifiedUser);
  });

  test("sends a new OTP to the email address", async () => {
    mockSendVerification.mockResolvedValue(true);
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
        return true;
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

  test("does not email an address that has no account", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const res = createRes();

    await checkValidOTP({ body: { email: "stranger@example.com", otp: "x" } }, res);

    expect(mockSendVerification).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid One Time Password" });
  });

  test("does not email an account that is already verified", async () => {
    mockUserFindUnique.mockResolvedValue(verifiedUser);
    const res = createRes();

    await checkValidOTP({ body: { email: "a@example.com", otp: "x" } }, res);

    expect(mockSendVerification).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("answers 429 when a code was sent too recently", async () => {
    mockSendVerification.mockResolvedValue(false);
    const res = createRes();

    await checkValidOTP({ body: { email: "a@example.com", otp: "x" } }, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(COOLDOWN);
  });
});

describe("validateEmail - resendOtp", () => {
  const GENERIC = { message: "If that account needs verifying, a new code has been sent" };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendVerification.mockResolvedValue(true);
  });

  test("emails an unverified account a new code", async () => {
    mockUserFindUnique.mockResolvedValue(unverifiedUser);
    const res = createRes();

    await resendOtp({ body: { email: "a@example.com" } }, res);

    expect(mockSendVerification).toHaveBeenCalledWith("a@example.com");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(GENERIC);
  });

  test("does not email an address with no account, and gives the same answer", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const res = createRes();

    await resendOtp({ body: { email: "stranger@example.com" } }, res);

    expect(mockSendVerification).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(GENERIC);
  });

  test("does not email an account that is already verified", async () => {
    mockUserFindUnique.mockResolvedValue(verifiedUser);
    const res = createRes();

    await resendOtp({ body: { email: "a@example.com" } }, res);

    expect(mockSendVerification).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("answers 429 when a code was sent too recently", async () => {
    mockUserFindUnique.mockResolvedValue(unverifiedUser);
    mockSendVerification.mockResolvedValue(false);
    const res = createRes();

    await resendOtp({ body: { email: "a@example.com" } }, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(COOLDOWN);
  });

  test("answers 400 when no email is given", async () => {
    const res = createRes();

    await resendOtp({ body: {} }, res);

    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("answers 500 when the code cannot be sent", async () => {
    mockUserFindUnique.mockResolvedValue(unverifiedUser);
    mockSendVerification.mockRejectedValue(new Error("SMTP down"));
    const res = createRes();

    await resendOtp({ body: { email: "a@example.com" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Failed to send OTP" });
  });
});
