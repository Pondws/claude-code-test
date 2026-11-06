import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const healthRouter = Router();

/** Liveness: the process is up and serving requests. */
healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

/** Readiness: dependencies (database) are reachable. */
healthRouter.get("/ready", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "ok" });
  } catch (err) {
    req.log.error({ err }, "Readiness check failed");
    res.status(503).json({ status: "unavailable", database: "unreachable" });
  }
});
