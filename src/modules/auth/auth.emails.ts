import { env } from "../../config/env.js";
import type { MailMessage } from "../../lib/mailer.js";

function link(path: string, token: string) {
  const url = new URL(path, env.APP_URL);
  url.searchParams.set("token", token);
  return url.toString();
}

export function verifyEmail(to: string, token: string): MailMessage {
  const url = link("/verify-email", token);
  return {
    to,
    subject: "Verify your email address",
    text: `Confirm your email address by opening this link:\n\n${url}\n\nThis link expires in ${env.EMAIL_VERIFICATION_TTL_HOURS} hours.`,
    html: `<p>Confirm your email address by clicking the link below.</p><p><a href="${url}">Verify email</a></p><p>This link expires in ${env.EMAIL_VERIFICATION_TTL_HOURS} hours.</p>`,
  };
}

export function resetPassword(to: string, token: string): MailMessage {
  const url = link("/reset-password", token);
  return {
    to,
    subject: "Reset your password",
    text: `A password reset was requested for your account. Open this link to choose a new password:\n\n${url}\n\nThis link expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.`,
    html: `<p>A password reset was requested for your account.</p><p><a href="${url}">Choose a new password</a></p><p>This link expires in ${env.PASSWORD_RESET_TTL_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>`,
  };
}

export function passwordChanged(to: string): MailMessage {
  return {
    to,
    subject: "Your password was changed",
    text: "The password for your account was just changed and all other sessions were signed out. If this wasn't you, reset your password immediately.",
  };
}
