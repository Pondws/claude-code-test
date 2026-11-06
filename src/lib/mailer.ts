import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

class SmtpMailer implements Mailer {
  private transporter: Transporter;
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });
  }
  async send(message: MailMessage) {
    await this.transporter.sendMail({ from: env.MAIL_FROM, ...message });
  }
}

/** Development fallback: writes emails to the log instead of sending them. */
class LogMailer implements Mailer {
  async send(message: MailMessage) {
    logger.info({ mail: message }, "Email (not sent: SMTP_HOST is not configured)");
  }
}

/** Test helper: keeps sent mail in memory. */
export class MemoryMailer implements Mailer {
  public readonly sent: MailMessage[] = [];
  async send(message: MailMessage) {
    this.sent.push(message);
  }
}

let mailer: Mailer = env.SMTP_HOST ? new SmtpMailer() : new LogMailer();

export function getMailer(): Mailer {
  return mailer;
}

export function setMailer(m: Mailer) {
  mailer = m;
}

/**
 * Sends mail without blocking (or failing) the HTTP response; delivery
 * errors are logged. Keeps response timing independent of SMTP latency.
 */
export function sendMailInBackground(message: MailMessage) {
  getMailer()
    .send(message)
    .catch((err: unknown) => logger.error({ err, to: message.to, subject: message.subject }, "Failed to send email"));
}
