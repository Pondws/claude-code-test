import type { RequestHandler } from "express";
import type { z } from "zod";

/** Validates and replaces req.body with the parsed (typed, stripped) value. */
export function validateBody<T extends z.ZodType>(schema: T): RequestHandler {
  return (req, _res, next) => {
    req.body = schema.parse(req.body ?? {});
    next();
  };
}
