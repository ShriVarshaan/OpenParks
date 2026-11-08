// Test-only helper: empties the app tables between DB test runs.
// Refuses to touch any database whose name does not end in "_test", so a misconfigured
// DATABASE_URL can never wipe a dev or hosted database.

const APP_TABLES = ['"User"', '"Park"', '"ParkAmenity"', '"SafetyReport"', '"Review"', "trails", '"OneTimePasswords"'];

export async function emptyTestDatabase(prisma) {
  const [{ db }] = await prisma.$queryRaw`SELECT current_database() AS db`;
  if (!db.endsWith("_test")) {
    throw new Error(`Refusing to empty database "${db}": DB tests only run against a database ending in _test`);
  }
  await prisma.$executeRawUnsafe(`TRUNCATE ${APP_TABLES.join(", ")} RESTART IDENTITY CASCADE`);
}
