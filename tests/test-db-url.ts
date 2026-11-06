export const TEST_DATABASE_URL =
  process.env["TEST_DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/auth_test?schema=public";
