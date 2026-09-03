/**
 * Maps HTTP status + backend error codes into user-facing messages.
 * Keeping this centralized means:
 *   - Mobile (later) can reuse exact same strings
 *   - A/B testing copy is a single-file edit
 *   - Engineers can't accidentally leak backend stack traces
 */

// Catch-all
const GENERIC = "Something went wrong. Please try again.";

const STATUS_TEXT: Record<number, string> = {
  400: "The information you entered is not quite right. Please check and try again.",
  401: "Invalid email or password.",
  403: "You are not allowed to perform this action.",
  404: "This request could not be found.",
  409: "Conflict — the information already exists.",
  422: "We could not process this. Please review your inputs.",
  429: "Too many attempts. Please try again later.",
  500: GENERIC,
  502: GENERIC,
  503: GENERIC,
};

// Backend error.code → polished user message
const KNOWN_CODES: Record<string, string> = {
  EMAIL_ALREADY_REGISTERED: "Email already registered.",
  MOBILE_ALREADY_REGISTERED: "Mobile number already registered.",
  USERNAME_ALREADY_TAKEN: "Username already taken.",
  INVALID_CREDENTIALS: "Invalid email or password.",
  INVALID_EMAIL_OR_PASSWORD: "Invalid email or password.",
  INVALID_MOBILE_OR_PASSWORD: "Invalid mobile number or password.",
  OTP_INVALID: "Invalid OTP.",
  OTP_EXPIRED: "OTP expired. Please request a new one.",
  ACCOUNT_NOT_VERIFIED: "Account not verified. Please verify your account to continue.",
  TOKEN_EXPIRED: "Session expired. Please sign in again.",
  SESSION_EXPIRED: "Session expired. Please sign in again.",
  PASSWORD_TOO_WEAK: "Password does not meet requirements.",
  PASSWORDS_DO_NOT_MATCH: "Passwords do not match.",
  TOO_MANY_REQUESTS: "Too many attempts. Please try again later.",
  VALIDATION_ERROR: "Please review the highlighted fields and try again.",
  NETWORK_ERROR: "Unable to connect to the server.",
  NOT_IMPLEMENTED: "This action is not available yet on the SocietyOne server.",
};

export function mapHttpErrorToUserMessage(status: number): string {
  return STATUS_TEXT[status] ?? GENERIC;
}

export function resolveErrorMessage(
  status: number,
  code: string | undefined | null,
  fallbackMessage?: string | null,
): string {
  if (code && KNOWN_CODES[code]) return KNOWN_CODES[code];
  if (fallbackMessage && fallbackMessage.trim()) return fallbackMessage;
  return mapHttpErrorToUserMessage(status);
}

export { GENERIC as GENERIC_ERROR_MESSAGE };

export function credentialsErrorMessage(method: "email" | "mobile"): string {
  return method === "mobile"
    ? "Invalid mobile number or password."
    : "Invalid email or password.";
}

export function toUserError(err: unknown, fallback = "Unable to connect to the server."): string {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string" && err.message.trim()) {
    return err.message;
  }
  return fallback;
}
