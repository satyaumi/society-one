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
  OTP_INVALID: "Invalid OTP. Please check the code and try again.",
  OTP_EXPIRED: "This OTP has expired. Please request a new OTP.",
  OTP_COOLDOWN: "Please wait before requesting another OTP.",
  OTP_MAX_ATTEMPTS: "Too many failed attempts. Please request a new OTP.",
  OTP_ALREADY_USED: "This OTP has already been used. Please request a new OTP.",
  ACCOUNT_NOT_VERIFIED: "Account not verified. Please verify your account to continue.",
  TOKEN_EXPIRED: "Session expired. Please sign in again.",
  SESSION_EXPIRED: "Session expired. Please sign in again.",
  PASSWORD_TOO_WEAK: "Password does not meet requirements.",
  PASSWORDS_DO_NOT_MATCH: "Passwords do not match.",
  TOO_MANY_REQUESTS: "Too many attempts. Please try again later.",
  SOCIETY_ALREADY_EXISTS: "You already have a society set up.",
  DUPLICATE_SOCIETY_NAME: "A society with this name already exists.",
  DUPLICATE_BUILDING: "A building with this name already exists.",
  DUPLICATE_FLOOR: "This floor already exists in the building.",
  DUPLICATE_FLAT: "A flat with this number already exists in the building.",
  VALIDATION_ERROR: "Please review the highlighted fields and try again.",
  NETWORK_ERROR: "Unable to connect to the server.",
  NOT_IMPLEMENTED: "This action is not available yet on the SocietyOne server.",
  SMTP_NOT_CONFIGURED: "Email delivery service is not configured with SMTP credentials. Please configure your Gmail address and Google App Password in societyone-backend/.env",
  SMTP_DELIVERY_FAILED: "Unable to send email via SMTP. Please check your SMTP settings and Google App Password.",
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

export function credentialsErrorMessage(method?: string): string {
  return method === "mobile"
    ? "Invalid mobile number or password."
    : "Invalid username, email, or password.";
}

export function toUserError(err: unknown, fallback = "Unable to connect to the server."): string {
  if (err && typeof err === "object") {
    const e = err as { status?: number; code?: string; message?: string };
    if (typeof e.status === "number") {
      return resolveErrorMessage(e.status, e.code, e.message);
    }
    if (typeof e.message === "string" && e.message.trim()) {
      return e.message;
    }
  }
  return fallback;
}

