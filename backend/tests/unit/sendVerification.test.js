import { jest } from "@jest/globals";

const mockSendMail = jest.fn();
const mockOtpFindFirst = jest.fn();
const mockOtpCreate = jest.fn();

jest.unstable_mockModule("nodemailer", () => ({
  default: {
    createTransport: () => ({ verify: jest.fn().mockResolvedValue(true), sendMail: mockSendMail }),
  },
}));
jest.unstable_mockModule("../../src/config/prisma.js", () => ({
  default: {
    oneTimePasswords: { findFirst: mockOtpFindFirst, create: mockOtpCreate, update: jest.fn() },
  },
}));

const { sendVerification, OTP_COOLDOWN_SECONDS } = await import("../../src/controllers/sendVerification.js");

describe("sendVerification - cooldown", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendMail.mockResolvedValue({});
    mockOtpCreate.mockResolvedValue({});
  });

  test("emails a new code and returns true when none was sent recently", async () => {
    mockOtpFindFirst.mockResolvedValue(null);

    await expect(sendVerification("a@example.com")).resolves.toBe(true);

    expect(mockOtpCreate).toHaveBeenCalled();
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "a@example.com" }));
  });

  test("sends nothing and returns false when a code was sent to that address within the cooldown", async () => {
    mockOtpFindFirst.mockResolvedValueOnce({ id: 1n, email: "a@example.com", created_at: new Date() });

    await expect(sendVerification("a@example.com")).resolves.toBe(false);

    expect(mockOtpCreate).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  test("looks for a code sent to that address within the cooldown window", async () => {
    mockOtpFindFirst.mockResolvedValue(null);
    const before = Date.now();

    await sendVerification("a@example.com");

    const { where } = mockOtpFindFirst.mock.calls[0][0];
    expect(where.email).toBe("a@example.com");
    const windowLength = before - where.created_at.gt.getTime();
    expect(Math.abs(windowLength - OTP_COOLDOWN_SECONDS * 1000)).toBeLessThan(100);
  });
});
