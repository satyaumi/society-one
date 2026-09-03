/**
 * Password policy configuration + validators.
 * MATCH this with Spring Boot's @Pattern / PasswordEncoder rules.
 * Edit one place, not every form.
 */

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
  allowedSpecialChars: string; // e.g. "!@#$%^&*()-_=+{}[]|;:,.<>?"
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = Object.freeze({
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  allowedSpecialChars: "!@#$%^&*()\\-=+\$$\$${};':\",./<>?_|\\\\~`",
});

export interface PasswordRuleCheck {
  key: keyof PasswordPolicy | "minLength";
  label: string;
  pass: boolean;
}

export function evaluatePassword(
  value: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): PasswordRuleCheck[] {
  const specialRegex = new RegExp(`[${policy.allowedSpecialChars}]`);
  return [
    {
      key: "minLength",
      label: `At least ${policy.minLength} characters`,
      pass: value.length >= policy.minLength,
    },
    {
      key: "requireUppercase",
      label: "One uppercase letter",
      pass: !policy.requireUppercase || /[A-Z]/.test(value),
    },
    {
      key: "requireLowercase",
      label: "One lowercase letter",
      pass: !policy.requireLowercase || /[a-z]/.test(value),
    },
    {
      key: "requireNumber",
      label: "One number",
      pass: !policy.requireNumber || /\d/.test(value),
    },
    {
      key: "requireSpecial",
      label: "One special character",
      pass: !policy.requireSpecial || specialRegex.test(value),
    },
  ];
}

/** 0..5 based on how many independent rule-groups pass → drives strength meter */
export function passwordStrengthScore(
  value: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): 0 | 1 | 2 | 3 | 4 | 5 {
  const checks = evaluatePassword(value, policy);
  // bonus: length past minimum adds robustness
  const lenBonus = value.length >= policy.minLength + 4 ? 1 : 0;
  const passed = checks.filter((c) => c.pass).length;
  const score = Math.min(5, passed + lenBonus);
  return score as 0 | 1 | 2 | 3 | 4 | 5;
}

export function passwordMeetsPolicy(
  value: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): boolean {
  return evaluatePassword(value, policy).every((check) => check.pass);
}

export function strengthLabel(score: 0 | 1 | 2 | 3 | 4 | 5): string {
  return ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"][score];
}
export function passwordStrengthColor(
  score: 0 | 1 | 2 | 3 | 4 | 5,
): "slate" | "red" | "orange" | "yellow" | "green" | "emerald" {
  const colors = [
    "slate",
    "red",
    "orange",
    "yellow",
    "green",
    "emerald",
  ] as const;

  return colors[score];
}

// -------------------- Username --------------------
export const USERNAME_POLICY = Object.freeze({
  minLength: 3,
  maxLength: 30,
  allowed: /^[a-zA-Z0-9_.-]+$/,
});

export function validateUsername(username: string): string | null {
  if (!username) return "Username is required.";
  const trimmed = username.trim();
  if (/\s/.test(username)) return "Username cannot contain spaces.";
  if (trimmed.length < USERNAME_POLICY.minLength)
    return `Username must be at least ${USERNAME_POLICY.minLength} characters.`;
  if (trimmed.length > USERNAME_POLICY.maxLength)
    return `Username must be at most ${USERNAME_POLICY.maxLength} characters.`;
  if (!USERNAME_POLICY.allowed.test(trimmed))
    return "Username may only contain letters, numbers, and . _ -";
  return null;
}

// -------------------- Email --------------------
// RFC-5322 sane subset; backend does real check.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) return "Email is required.";
  if (!EMAIL_REGEX.test(email.trim())) return "Please enter a valid email address.";
  return null;
}

// -------------------- Mobile numbers (international) --------------------
export const DEFAULT_COUNTRY_CODES = Object.freeze([
  { code: "+91", flag: "🇮🇳", label: "India (+91)" },
  { code: "+1", flag: "🇺🇸", label: "US / Canada (+1)" },
  { code: "+44", flag: "🇬🇧", label: "UK (+44)" },
  { code: "+971", flag: "🇦🇪", label: "UAE (+971)" },
  { code: "+65", flag: "🇸🇬", label: "Singapore (+65)" },
  { code: "+61", flag: "🇦🇺", label: "Australia (+61)" },
]);

/** Strips spaces + dashes, leaves digits and leading + */
export function sanitizeMobile(value: string): string {
  let v = value.replace(/[\s\-()]/g, "");
  if (v.startsWith("00")) v = `+${v.slice(2)}`;
  return v;
}

/** E.164-ish check: + then 6-15 digits */
export function validateMobile(
  countryCode: string,
  localNumber: string,
): string | null {
  const full = sanitizeMobile(`${countryCode}${localNumber}`);
  if (!localNumber.trim()) return "Mobile number is required.";
  if (!/^\+[1-9]\d{5,14}$/.test(full)) return "Please enter a valid phone number.";
  return null;
}
