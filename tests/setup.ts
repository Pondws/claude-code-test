import { afterAll, beforeEach } from "vitest";
import { MemoryMailer, setMailer } from "../src/lib/mailer.js";
import { prisma } from "../src/lib/prisma.js";

export const mailer = new MemoryMailer();
setMailer(mailer);

beforeEach(async () => {
  mailer.sent.length = 0;
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "refresh_tokens", "verification_tokens", "users" RESTART IDENTITY CASCADE',
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
