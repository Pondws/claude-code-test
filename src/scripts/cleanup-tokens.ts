/**
 * Deletes expired/used tokens. Run periodically (e.g. a daily cron job):
 *   npm run tokens:cleanup
 */
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";

const RETENTION_DAYS = 7;

async function main() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const refresh = await prisma.refreshToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }] },
  });
  const oneTime = await prisma.verificationToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { lt: cutoff } }] },
  });

  logger.info({ refreshTokens: refresh.count, verificationTokens: oneTime.count }, "Token cleanup complete");
}

main()
  .catch((err: unknown) => {
    logger.error({ err }, "Token cleanup failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
