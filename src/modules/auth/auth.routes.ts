import { Router, type CookieOptions, type Request, type Response } from "express";
import { env } from "../../config/env.js";
import { requireAuth } from "../../middleware/auth.js";
import { authLimiter, refreshLimiter } from "../../middleware/rate-limit.js";
import { validateBody } from "../../middleware/validate.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
} from "./auth.schemas.js";
import * as auth from "./auth.service.js";

export const REFRESH_COOKIE = "refresh_token";
export const AUTH_BASE_PATH = "/api/v1/auth";

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "strict",
    // Only sent to auth endpoints, never to the rest of the API.
    path: AUTH_BASE_PATH,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

function meta(req: Request): auth.ClientMeta {
  return { ip: req.ip, userAgent: req.get("user-agent") };
}

function sendSession(res: Response, session: auth.Session, body: Record<string, unknown> = {}, status = 200) {
  res.cookie(REFRESH_COOKIE, session.refreshToken, { ...cookieOptions(), expires: session.refreshTokenExpiresAt });
  res.status(status).json({
    ...body,
    accessToken: session.accessToken,
    tokenType: "Bearer",
    expiresIn: session.accessTokenExpiresIn,
  });
}

function clearSession(res: Response) {
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
}

function readRefreshToken(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export const authRouter = Router();

authRouter.post("/register", authLimiter, validateBody(registerSchema), async (req, res) => {
  const { user, session } = await auth.register(req.body, meta(req));
  sendSession(res, session, { user }, 201);
});

authRouter.post("/login", authLimiter, validateBody(loginSchema), async (req, res) => {
  const { user, session } = await auth.login(req.body, meta(req));
  sendSession(res, session, { user });
});

authRouter.post("/refresh", refreshLimiter, async (req, res) => {
  try {
    const { user, session } = await auth.refresh(readRefreshToken(req), meta(req));
    sendSession(res, session, { user });
  } catch (err) {
    clearSession(res);
    throw err;
  }
});

authRouter.post("/logout", async (req, res) => {
  await auth.logout(readRefreshToken(req));
  clearSession(res);
  res.status(204).end();
});

authRouter.post("/logout-all", requireAuth, async (req, res) => {
  await auth.logoutAll(req.auth!.userId);
  clearSession(res);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ user: await auth.getUser(req.auth!.userId) });
});

authRouter.post("/verify-email", authLimiter, validateBody(tokenSchema), async (req, res) => {
  const user = await auth.verifyEmail(req.body.token);
  res.json({ user });
});

authRouter.post("/resend-verification", authLimiter, requireAuth, async (req, res) => {
  await auth.resendVerification(req.auth!.userId);
  res.status(202).json({ message: "Verification email sent" });
});

authRouter.post("/forgot-password", authLimiter, validateBody(forgotPasswordSchema), async (req, res) => {
  await auth.forgotPassword(req.body.email);
  res.status(202).json({ message: "If an account exists for that email, a reset link has been sent" });
});

authRouter.post("/reset-password", authLimiter, validateBody(resetPasswordSchema), async (req, res) => {
  await auth.resetPassword(req.body.token, req.body.password);
  clearSession(res);
  res.json({ message: "Password has been reset. Please sign in again." });
});

authRouter.post("/change-password", authLimiter, requireAuth, validateBody(changePasswordSchema), async (req, res) => {
  const session = await auth.changePassword(
    req.auth!.userId,
    req.body.currentPassword,
    req.body.newPassword,
    meta(req),
  );
  sendSession(res, session);
});
