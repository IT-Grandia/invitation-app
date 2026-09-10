export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'REGISTRATION_CLOSED'
  | 'EVENT_FULL'
  | 'ALREADY_CHECKED_IN'
  | 'REGISTRATION_CANCELLED'
  | 'PHONE_ALREADY_REGISTERED'
  | 'TURNSTILE_FAILED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'

const STATUS: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  TURNSTILE_FAILED: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  REGISTRATION_CLOSED: 409,
  EVENT_FULL: 409,
  ALREADY_CHECKED_IN: 409,
  REGISTRATION_CANCELLED: 409,
  PHONE_ALREADY_REGISTERED: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
}

/**
 * Every endpoint answers failures in the same shape. `message` is written in
 * Indonesian and is safe to render straight to the user; `code` is what client
 * code branches on.
 */
export function apiError(
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>,
  headers?: HeadersInit,
) {
  return Response.json({ error: { code, message, details } }, { status: STATUS[code], headers })
}

export function unauthorized() {
  return apiError('UNAUTHORIZED', 'Kode petugas tidak valid.')
}
