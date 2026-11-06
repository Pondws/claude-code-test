import type { Role } from "./generated/prisma/client.js";

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; role: Role };
    }
  }
}

export {};
