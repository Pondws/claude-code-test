import { describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { BASE, PASSWORD, api, lastTokenFromMail, refreshCookie, registerUser } from "./helpers.js";

describe("health", () => {
  it("reports liveness and readiness", async () => {
    await api().get("/health").expect(200, { status: "ok" });
    await api().get("/ready").expect(200);
  });
});

describe("register", () => {
  it("creates a user, returns tokens and sets a secure refresh cookie", async () => {
    const { res } = await registerUser("Alice@Example.com ");
    expect(res.body.user).toMatchObject({ email: "alice@example.com", emailVerified: false, role: "USER" });
    expect(res.body.user).not.toHaveProperty("passwordHash");
    expect(res.body.accessToken).toEqual(expect.any(String));
    const cookie = (res.headers["set-cookie"] as unknown as string[]).join(";");
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: "alice@example.com" } });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it("rejects duplicate emails", async () => {
    await registerUser();
    const res = await api().post(`${BASE}/register`).send({ email: "alice@example.com", password: PASSWORD });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("validates input", async () => {
    const res = await api().post(`${BASE}/register`).send({ email: "nope", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.map((d: { path: string }) => d.path).sort()).toEqual(["email", "password"]);
  });

  it("rejects malformed JSON", async () => {
    const res = await api().post(`${BASE}/register`).set("Content-Type", "application/json").send("{bad");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });
});

describe("login", () => {
  it("logs in with valid credentials", async () => {
    await registerUser();
    const res = await api().post(`${BASE}/login`).send({ email: "alice@example.com", password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    refreshCookie(res);
  });

  it("returns the same error for unknown email and wrong password", async () => {
    await registerUser();
    const a = await api().post(`${BASE}/login`).send({ email: "bob@example.com", password: PASSWORD });
    const b = await api().post(`${BASE}/login`).send({ email: "alice@example.com", password: "wrong password!!" });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body).toEqual(b.body);
  });

  it("locks the account after repeated failures", async () => {
    await registerUser();
    for (let i = 0; i < 3; i++) {
      await api().post(`${BASE}/login`).send({ email: "alice@example.com", password: "wrong password!!" }).expect(401);
    }
    const res = await api().post(`${BASE}/login`).send({ email: "alice@example.com", password: PASSWORD });
    expect(res.status).toBe(423);
    expect(res.body.error.code).toBe("ACCOUNT_LOCKED");
  });
});

describe("me / access tokens", () => {
  it("returns the current user", async () => {
    const { accessToken } = await registerUser();
    const res = await api().get(`${BASE}/me`).set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("alice@example.com");
  });

  it("rejects missing and invalid tokens", async () => {
    expect((await api().get(`${BASE}/me`)).body.error.code).toBe("TOKEN_MISSING");
    const res = await api().get(`${BASE}/me`).set("Authorization", "Bearer garbage");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("TOKEN_INVALID");
  });
});

describe("refresh token rotation", () => {
  it("rotates the refresh token", async () => {
    const { cookie } = await registerUser();
    const res = await api().post(`${BASE}/refresh`).set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(refreshCookie(res)).not.toBe(cookie);
  });

  it("detects reuse and revokes the whole family", async () => {
    const { cookie: first } = await registerUser();
    const second = refreshCookie(await api().post(`${BASE}/refresh`).set("Cookie", first).expect(200));

    // Replaying the rotated-out token...
    const reuse = await api().post(`${BASE}/refresh`).set("Cookie", first);
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe("REFRESH_TOKEN_REUSED");

    // ...also invalidates the legitimate successor.
    await api().post(`${BASE}/refresh`).set("Cookie", second).expect(401);
  });

  it("only lets one of two concurrent refreshes succeed", async () => {
    const { cookie } = await registerUser();
    const results = await Promise.all([
      api().post(`${BASE}/refresh`).set("Cookie", cookie),
      api().post(`${BASE}/refresh`).set("Cookie", cookie),
    ]);
    expect(results.filter((r) => r.status === 200).length).toBeLessThanOrEqual(1);
  });

  it("rejects missing and unknown tokens", async () => {
    expect((await api().post(`${BASE}/refresh`)).body.error.code).toBe("REFRESH_TOKEN_MISSING");
    await api().post(`${BASE}/refresh`).set("Cookie", "refresh_token=nope").expect(401);
  });

  it("rejects expired tokens", async () => {
    const { cookie } = await registerUser();
    await prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await api().post(`${BASE}/refresh`).set("Cookie", cookie);
    expect(res.body.error.code).toBe("REFRESH_TOKEN_EXPIRED");
  });
});

describe("logout", () => {
  it("revokes the session", async () => {
    const { cookie } = await registerUser();
    await api().post(`${BASE}/logout`).set("Cookie", cookie).expect(204);
    await api().post(`${BASE}/refresh`).set("Cookie", cookie).expect(401);
  });

  it("logout-all revokes every session and outstanding access tokens", async () => {
    const { accessToken, cookie } = await registerUser();
    const other = refreshCookie(
      await api().post(`${BASE}/login`).send({ email: "alice@example.com", password: PASSWORD }).expect(200),
    );
    await api().post(`${BASE}/logout-all`).set("Authorization", `Bearer ${accessToken}`).expect(204);
    await api().get(`${BASE}/me`).set("Authorization", `Bearer ${accessToken}`).expect(401);
    await api().post(`${BASE}/refresh`).set("Cookie", cookie).expect(401);
    await api().post(`${BASE}/refresh`).set("Cookie", other).expect(401);
  });
});

describe("email verification", () => {
  it("verifies email with the mailed token, once", async () => {
    await registerUser();
    const token = await lastTokenFromMail(/verify/i);
    const res = await api().post(`${BASE}/verify-email`).send({ token });
    expect(res.status).toBe(200);
    expect(res.body.user.emailVerified).toBe(true);
    await api().post(`${BASE}/verify-email`).send({ token }).expect(400);
  });

  it("invalidates older tokens when resending", async () => {
    const { accessToken } = await registerUser();
    const first = await lastTokenFromMail(/verify/i);
    await api().post(`${BASE}/resend-verification`).set("Authorization", `Bearer ${accessToken}`).expect(202);
    const second = await lastTokenFromMail(/verify/i);
    expect(second).not.toBe(first);
    await api().post(`${BASE}/verify-email`).send({ token: first }).expect(400);
    await api().post(`${BASE}/verify-email`).send({ token: second }).expect(200);
  });
});

describe("password reset", () => {
  it("does not reveal whether an account exists", async () => {
    const res = await api().post(`${BASE}/forgot-password`).send({ email: "ghost@example.com" });
    expect(res.status).toBe(202);
  });

  it("resets the password and revokes existing sessions", async () => {
    const { accessToken, cookie } = await registerUser();
    await api().post(`${BASE}/forgot-password`).send({ email: "alice@example.com" }).expect(202);
    const token = await lastTokenFromMail(/reset/i);

    const newPassword = "an entirely new passphrase";
    await api().post(`${BASE}/reset-password`).send({ token, password: newPassword }).expect(200);

    await api().get(`${BASE}/me`).set("Authorization", `Bearer ${accessToken}`).expect(401);
    await api().post(`${BASE}/refresh`).set("Cookie", cookie).expect(401);
    await api().post(`${BASE}/login`).send({ email: "alice@example.com", password: PASSWORD }).expect(401);
    await api().post(`${BASE}/login`).send({ email: "alice@example.com", password: newPassword }).expect(200);

    // Token is single-use.
    await api().post(`${BASE}/reset-password`).send({ token, password: "yet another passphrase" }).expect(400);
  });

  it("rejects expired reset tokens", async () => {
    await registerUser();
    await api().post(`${BASE}/forgot-password`).send({ email: "alice@example.com" }).expect(202);
    const token = await lastTokenFromMail(/reset/i);
    await prisma.verificationToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await api().post(`${BASE}/reset-password`).send({ token, password: "an entirely new passphrase" }).expect(400);
  });
});

describe("change password", () => {
  it("requires the current password", async () => {
    const { accessToken } = await registerUser();
    const res = await api()
      .post(`${BASE}/change-password`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ currentPassword: "not my password", newPassword: "an entirely new passphrase" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_CURRENT_PASSWORD");
  });

  it("changes the password, signs out other sessions and issues a new one", async () => {
    const { accessToken, cookie } = await registerUser();
    const res = await api()
      .post(`${BASE}/change-password`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ currentPassword: PASSWORD, newPassword: "an entirely new passphrase" });
    expect(res.status).toBe(200);

    await api().get(`${BASE}/me`).set("Authorization", `Bearer ${accessToken}`).expect(401);
    await api().post(`${BASE}/refresh`).set("Cookie", cookie).expect(401);
    await api().get(`${BASE}/me`).set("Authorization", `Bearer ${res.body.accessToken}`).expect(200);
    await api().post(`${BASE}/refresh`).set("Cookie", refreshCookie(res)).expect(200);
  });
});

describe("security headers & misc", () => {
  it("sets helmet headers and hides x-powered-by", async () => {
    const res = await api().get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-request-id"]).toEqual(expect.any(String));
  });

  it("returns JSON 404s", async () => {
    const res = await api().get("/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
