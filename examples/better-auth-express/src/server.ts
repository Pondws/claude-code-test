import express, { type RequestHandler } from "express";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";

const app = express();

// Mount Better Auth BEFORE express.json(): it reads the raw request body itself.
// This one line creates every endpoint: /api/auth/sign-up/email, /sign-in/email,
// /sign-out, /get-session, /verify-email, /request-password-reset, ...
// ("{*any}" is Express 5 wildcard syntax; in Express 4 use "/api/auth/*".)
app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use(express.json());

/** Middleware for your own routes: loads the session from the cookie. */
const requireAuth: RequestHandler = async (req, res, next) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.locals.user = session.user;
  res.locals.session = session.session;
  next();
};

app.get("/api/me", requireAuth, (_req, res) => {
  res.json({ user: res.locals.user });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
