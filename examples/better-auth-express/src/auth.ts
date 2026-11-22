import { betterAuth } from "better-auth";
import { Pool } from "pg";

/**
 * In a real app send these with an email provider (Resend, SES, nodemailer...).
 * For the tutorial we just log the link so you can copy it.
 */
async function sendEmail(to: string, subject: string, url: string) {
  console.log(`\n📧 To: ${to}\n   Subject: ${subject}\n   Link: ${url}\n`);
}

export const auth = betterAuth({
  // 1) Database: Better Auth creates/uses the tables user, session, account, verification.
  database: new Pool({ connectionString: process.env.DATABASE_URL }),

  // 2) Public URL of this server and the secret used to sign cookies/tokens.
  //    Both are also read automatically from BETTER_AUTH_URL / BETTER_AUTH_SECRET.
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  // 3) Which browser origins may call the API (CSRF protection).
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? "http://localhost:5173").split(","),

  // 4) Email + password sign-in.
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    requireEmailVerification: true, // can't sign in until the email is verified
    revokeSessionsOnPasswordReset: true, // a reset signs out every device
    sendResetPassword: async ({ user, url }) => {
      void sendEmail(user.email, "Reset your password", url); // don't await: avoids timing leaks
    },
  },

  // 5) Email verification.
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail(user.email, "Verify your email", url);
    },
  },

  // 6) Sessions: stored in the database, referenced by an HttpOnly cookie.
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // extend the expiry at most once a day while in use
  },

  // 7) Built-in rate limiting (enabled in production by default; on here so you can see it).
  rateLimit: { enabled: true, window: 60, max: 100 },

  // 8) Social login: uncomment and add keys from Google Cloud Console.
  // socialProviders: {
  //   google: {
  //     clientId: process.env.GOOGLE_CLIENT_ID!,
  //     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  //   },
  // },
});
