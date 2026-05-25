export type AppErrorCode =
  | "PARSE_ERROR"
  | "CARD_NOT_FOUND"
  | "PROVIDER_ERROR"
  | "RATE_LIMITED"
  | "INVALID_COMMANDER"
  | "DECK_CONSTRAINT_FAILED";

export type AppError = { code: AppErrorCode; message: string; details?: Record<string, unknown> };
export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err(code: AppErrorCode, message: string, details?: Record<string, unknown>): Result<never> {
  return { ok: false, error: { code, message, details } };
}
