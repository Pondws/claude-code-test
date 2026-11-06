import { pino } from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL ?? (env.isTest ? "silent" : env.isProduction ? "info" : "debug"),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
      "*.password",
      "*.currentPassword",
      "*.newPassword",
      "*.token",
      "*.refreshToken",
      "*.accessToken",
    ],
    censor: "[REDACTED]",
  },
  ...(env.isProduction || env.isTest
    ? {}
    : { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } } }),
});
