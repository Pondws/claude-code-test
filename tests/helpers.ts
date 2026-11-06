import request from "supertest";
import { createApp } from "../src/app.js";
import { mailer } from "./setup.js";

export const app = createApp();
export const api = () => request(app);
export const BASE = "/api/v1/auth";

export const PASSWORD = "correct horse battery staple";

export function refreshCookie(res: request.Response): string {
  const raw = res.headers["set-cookie"] as unknown as string[] | undefined;
  const cookie = raw?.find((c) => c.startsWith("refresh_token="));
  if (!cookie) throw new Error("refresh_token cookie not set");
  return cookie.split(";")[0]!;
}

export async function registerUser(email = "alice@example.com", password = PASSWORD) {
  const res = await api().post(`${BASE}/register`).send({ email, password, name: "Alice" });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { res, accessToken: res.body.accessToken as string, cookie: refreshCookie(res) };
}

/** Polls briefly since mail is sent in the background. */
export async function lastTokenFromMail(subject: RegExp): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const mail = [...mailer.sent].reverse().find((m) => subject.test(m.subject));
    const match = mail?.text.match(/token=([\w-]+)/);
    if (match) return match[1]!;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(`no mail matching ${subject}`);
}
