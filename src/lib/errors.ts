export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(message = "Bad request", code = "BAD_REQUEST", details?: unknown) {
    return new AppError(400, code, message, details);
  }
  static unauthorized(message = "Unauthorized", code = "UNAUTHORIZED") {
    return new AppError(401, code, message);
  }
  static forbidden(message = "Forbidden", code = "FORBIDDEN") {
    return new AppError(403, code, message);
  }
  static notFound(message = "Not found", code = "NOT_FOUND") {
    return new AppError(404, code, message);
  }
  static conflict(message = "Conflict", code = "CONFLICT") {
    return new AppError(409, code, message);
  }
  static locked(message = "Account temporarily locked", code = "ACCOUNT_LOCKED") {
    return new AppError(423, code, message);
  }
}
