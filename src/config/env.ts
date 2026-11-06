import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1");

const csv = z
  .string()
  .transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),

    DATABASE_URL: z.url(),

    JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    JWT_ISSUER: z.string().default("auth-backend"),
    JWT_AUDIENCE: z.string().default("auth-backend-clients"),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(15 * 60),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().positive().default(24),
    PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),

    MAX_FAILED_LOGINS: z.coerce.number().int().positive().default(5),
    LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),

    COOKIE_SECURE: bool.optional(),
    COOKIE_DOMAIN: z.string().optional(),
    CORS_ORIGINS: csv.default([]),
    /** Value passed to Express "trust proxy". Set to the number of proxies in front of the app. */
    TRUST_PROXY: z.string().default("0"),

    /** Public URL of the frontend; used to build links in emails. */
    APP_URL: z.url().default("http://localhost:5173"),

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_SECURE: bool.default(false),
    MAIL_FROM: z.string().default("Auth <no-reply@example.com>"),

    RATE_LIMIT_DISABLED: bool.default(false),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    if (env.COOKIE_SECURE === false) {
      ctx.addIssue({ code: "custom", path: ["COOKIE_SECURE"], message: "must not be false in production" });
    }
    if (!env.SMTP_HOST) {
      ctx.addIssue({ code: "custom", path: ["SMTP_HOST"], message: "is required in production" });
    }
    if (env.CORS_ORIGINS.length === 0) {
      ctx.addIssue({ code: "custom", path: ["CORS_ORIGINS"], message: "is required in production" });
    }
    if (env.RATE_LIMIT_DISABLED) {
      ctx.addIssue({ code: "custom", path: ["RATE_LIMIT_DISABLED"], message: "must not be true in production" });
    }
  });

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    // Logger depends on env, so write directly to stderr.
    console.error(`Invalid environment configuration:\n${details}`);
    process.exit(1);
  }
  const env = parsed.data;
  return {
    ...env,
    isProduction: env.NODE_ENV === "production",
    isTest: env.NODE_ENV === "test",
    COOKIE_SECURE: env.COOKIE_SECURE ?? env.NODE_ENV === "production",
    TRUST_PROXY: parseTrustProxy(env.TRUST_PROXY),
  };
}

function parseTrustProxy(v: string): boolean | number | string {
  if (v === "true") return true;
  if (v === "false") return false;
  const n = Number(v);
  return Number.isInteger(n) ? n : v;
}

export const env = load();
export type Env = typeof env;
