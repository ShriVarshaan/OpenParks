import { jest } from "@jest/globals";
import { emptyTestDatabase } from "../db/resetTestDb.js";

const fakePrisma = (dbName) => ({
  $queryRaw: jest.fn().mockResolvedValue([{ db: dbName }]),
  $executeRawUnsafe: jest.fn().mockResolvedValue(0),
});

test("refuses to empty a database whose name does not end in _test", async () => {
  const prisma = fakePrisma("openparks");

  await expect(emptyTestDatabase(prisma)).rejects.toThrow('Refusing to empty database "openparks"');
  expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
});

test("truncates every app table, resetting ids, on a *_test database", async () => {
  const prisma = fakePrisma("openparks_test");

  await emptyTestDatabase(prisma);

  expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);
  const sql = prisma.$executeRawUnsafe.mock.calls[0][0];
  for (const table of ['"User"', '"Park"', '"ParkAmenity"', '"SafetyReport"', '"Review"', "trails", '"OneTimePasswords"']) {
    expect(sql).toContain(table);
  }
  expect(sql).toMatch(/RESTART IDENTITY CASCADE/);
});
