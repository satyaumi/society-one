# SocietyOne Authentication Integration - Implementation Plan

## Task 1: Fix UserRepository — add JpaRepository extension and query methods
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Modify `societyone-backend/src/main/java/com/societyone/app/auth/repository/UserRepository.java`
  - Make it `extends JpaRepository<User, Long>` and annotate with `@Repository`
  - Add the following Spring Data derived query methods:
    - `Optional<User> findByUsernameIgnoreCase(String username)`
    - `Optional<User> findByEmailIgnoreCase(String email)`
    - `Optional<User> findByMobileNumber(String mobileNumber)`
    - `boolean existsByUsernameIgnoreCase(String username)`
    - `boolean existsByEmailIgnoreCase(String email)`
    - `boolean existsByMobileNumber(String mobileNumber)`
  - Do NOT create a second repository file; modify the existing empty one.
- **Acceptance Criteria Addressed**: AC-1, AC-3
- **Test Requirements**:
  - `rule` TR-1.1: Backend `mvnw.cmd clean compile` succeeds (BUILD SUCCESS, exit 0). Evidence: Maven compile log.
  - `rule` TR-1.2: All six methods referenced in `AuthService.java` and `JwtAuthenticationFilter.java` resolve at compile time with no "cannot find symbol" errors. Evidence: compilation log free of symbol errors.
- **Notes**: This single change unblocks all other backend work since the project currently does not compile.

## Task 2: Harden SignupRequest/LoginRequest validation and identifier policy
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Add `@Email` validation on `SignupRequest.email`.
  - Add a class-level or service-level assertion that at least one of `email`/`mobileNumber` is non-blank on `SignupRequest` (throw `BAD_REQUEST` if both empty).
  - Add password complexity validation on the backend for defense-in-depth: min length 8, at least one upper, one lower, one digit, one special (match frontend `DEFAULT_PASSWORD_POLICY`). Create `@Pattern` or an explicit check in `AuthService.signup` / `reset-password` path. If a custom validator is too heavy, implement the check inline in `AuthService.signup` and the reset service and throw `BAD_REQUEST` with code `PASSWORD_TOO_WEAK` and message "Password does not meet requirements."
  - In `AuthService.login`, add a switch guard so unknown `method` values (not `email`/`mobile`) return `BAD_REQUEST` code `BAD_REQUEST` message "Authentication method must be email or mobile." (already present — verify).
  - Ensure username length on backend matches frontend (max 30 not 50); update SignupRequest `@Size(max=30)` and add the username allowed pattern `@Pattern(regexp="^[a-zA-Z0-9_.-]+$")`.
- **Acceptance Criteria Addressed**: AC-4, AC-11
- **Test Requirements**:
  - `rule` TR-2.1: Signup with weak password (8 lowercase, no digit/special/upper) returns 400 with error.code == `PASSWORD_TOO_WEAK`. Evidence: HTTP response body.
  - `rule` TR-2.2: Signup with both `email` null/blank and `mobileNumber` null/blank returns 400 `VALIDATION_ERROR`. Evidence: HTTP response.
  - `rule` TR-2.3: Signup username "ab" returns 400 (min 3), username "abcdefghijklmnopqrstuvwxyz12345" (31 chars) returns 400, username "bad name" (space) returns 400. Evidence: responses.
  - `rule` TR-2.4: Login `method` "foo" returns 400 "Authentication method must be email or mobile". Evidence: response.
- **Notes**: Prefer inline checks in `AuthService` over adding a new validator class; keep file footprint minimal.

## Task 3: Specific conflict error codes and CORS/security permitAll fixes
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - In `AuthService.signup`, change the three `ResponseStatusException CONFLICT` throws to use reason strings prefixed with distinct codes so `GlobalExceptionHandler` can differentiate, OR — simpler and preferred — add custom exception types or directly set the response reason to trigger error.code rewriting. Simplest correct approach: catch the `ResponseStatusException` branch logic in `GlobalExceptionHandler.handleResponseStatusException` by reading `exception.getReason()` and, for 409 responses whose reason exactly matches existing strings, map reason → code:
    - "Username is already registered" → `USERNAME_ALREADY_TAKEN`
    - "Email is already registered" → `EMAIL_ALREADY_REGISTERED`
    - "Mobile number is already registered" → `MOBILE_ALREADY_REGISTERED`
    - Leave default `CONFLICT` otherwise.
  - In `SecurityConfig.securityFilterChain.authorizeHttpRequests`, add to `permitAll()`:
    - `/api/auth/forgot-password`
    - `/api/auth/reset-password`
    - `/api/auth/verify-otp`
    - `/api/auth/resend-otp`
  - Verify `/api/auth/me` stays authenticated (not in permitAll).
- **Acceptance Criteria Addressed**: AC-9, AC-10, AC-14
- **Test Requirements**:
  - `rule` TR-3.1: Duplicate username signup → 409 body `error.code=="USERNAME_ALREADY_TAKEN"`. Evidence: HTTP response.
  - `rule` TR-3.2: Duplicate email → 409 `EMAIL_ALREADY_REGISTERED`; duplicate mobile → 409 `MOBILE_ALREADY_REGISTERED`. Evidence: HTTP responses.
  - `rule` TR-3.3: OPTIONS /api/auth/forgot-password without JWT → 200/403-permitted (not 401). Evidence: status.
  - `rule` TR-3.4: CORS OPTIONS from origin `http://localhost:5173` for login endpoint includes allow-origin, allow-methods, allow-headers. Evidence: response headers.

## Task 4: Implement OTP store service and DTOs for forgot/reset/verify flow
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Create exactly ONE new file `com.societyone.app.auth.service.OtpService` (no new interfaces unless needed; concrete class is fine) with:
    - Inner record `OtpEntry(String code, String purpose, Instant expiresAt, boolean consumed)`.
    - `ConcurrentHashMap<String, OtpEntry>` keyed by `identifier` (email or mobile normalized).
    - `generateOtp(identifier, purpose)` → 6-digit numeric OTP, TTL 5 minutes, log the OTP value at INFO level for DEV convenience.
    - `verifyOtp(identifier, purpose, otp)` → enum result VALID/INVALID/EXPIRED/ALREADY_CONSUMED; on VALID mark consumed.
    - `invalidate(identifier, purpose)`.
  - Add new DTO records (reuse existing frontend shapes):
    - `ForgotPasswordRequest(String method, String identifier)` with @NotBlank.
    - `VerifyOtpRequest(String identifier, String otp, String purpose)` with @NotBlank on identifier+otp.
    - `ResendOtpRequest(String identifier, String purpose)`.
    - `ResetPasswordRequest(String identifier, String otp, String newPassword)` with @NotBlank + password size.
    - `ForgotPasswordResponse(String identifier)`.
    - `VerifyOtpResponse` — union not possible with records; use two controller methods returning different types OR a single generic record with two optional fields; preferred: return `ApiResponse<SafeUserResponse>` (SIGNUP → issue JWT via login response shape? Actually frontend expects union — simplest: controller verify-otp returns `ApiResponse<Object>` or two separate endpoints. Simpler correct approach: return `AuthResponse` when purpose==SIGNUP needs auth; return `{verified:true}` (wrapped in ApiResponse.data) otherwise. Because ApiResponse<T> is generic, two endpoints may be cleanest. **Approved design**: one POST `/verify-otp` returning `ApiResponse<AuthResponse>` when purpose==SIGNUP after successful verification, and `ApiResponse<Map<String,Boolean>>` (data = `{verified:true}`) otherwise. Code casts safely.)
  - Implement password policy check on `newPassword`; code `PASSWORD_TOO_WEAK`.
- **Acceptance Criteria Addressed**: AC-7, AC-8
- **Test Requirements**:
  - `rule` TR-4.1: Forgot-password valid user → 200 `data.identifier==identifier`. Evidence: response.
  - `rule` TR-4.2: OTP verify with wrong digits → body error.code == `OTP_INVALID`. Evidence: response.
  - `rule` TR-4.3: OTP verify after 5 min TTL (simulated by advancing entry in code OR by generating with very short TTL in test wrapper) → error.code == `OTP_EXPIRED`. Evidence: response.
  - `rule` TR-4.4: OTP verify succeeds once; same OTP second attempt → `OTP_INVALID`. Evidence: two responses.

## Task 5: Add forgot-password / reset-password / verify-otp / resend-otp controller endpoints and AuthService methods
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - In `AuthService`, add:
    - `Map<String,Object> forgotPassword(ForgotPasswordRequest req)`: find user (don't leak existence! But per FR-7 in spec we do want to look up; for security against enumeration we could always return 200 with identifier echoed. SAFEST: always 200 and {identifier = request identifier} even if user not found; still log OTP if found, otherwise log WARN "forgot requested for unknown identifier". OTP generation runs only if user exists, but the response shape never discloses existence.)
    - `Object verifyOtp(VerifyOtpRequest req)`: validate via OtpService; if purpose=SIGNUP look up user by identifier (need lookup-by-identifier helper method on AuthService that tries email then mobile), issue token + return `AuthResponse`; if purpose=PASSWORD_RESET return singleton map `{verified:true}`; if purpose=LOGIN issue token.
    - `void resendOtp(ResendOtpRequest req)`: invalidate prior, generate new.
    - `void resetPassword(ResetPasswordRequest req)`: verify OTP purpose=PASSWORD_RESET valid + not consumed, load user by identifier, validate policy, BCrypt encode and set new passwordHash, invalidate OTP, save.
  - In `AuthController`, add POST endpoints:
    - `/forgot-password` → `ApiResponse<ForgotPasswordResponse>`
    - `/verify-otp` → `ApiResponse<Object>` wrapping AuthResponse OR `{verified:true}`.
    - `/resend-otp` → `ApiResponse<Void>`.
    - `/reset-password` → `ApiResponse<Void>` with success message.
  - Ensure all DTOs use @Valid in controller params.
  - Add identifier-lookup helper `findUserByIdentifier(method|identifier)` in AuthService that dispatches by method or by guessing from identifier shape.
- **Acceptance Criteria Addressed**: AC-2, AC-7, AC-8
- **Test Requirements**:
  - `rule` TR-5.1: `/forgot-password` POST returns 200 even for unknown email (no user enumeration). Evidence: 200 response.
  - `rule` TR-5.2: `/reset-password` with valid OTP + new password → 200, subsequent login with OLD password 401, NEW password 200 JWT. Evidence: 3 HTTP calls.
  - `rule` TR-5.3: `/resend-otp` succeeds 200; the prior OTP is now invalid. Evidence: prior OTP fails with OTP_INVALID.
  - `rule` TR-5.4: `/verify-otp` purpose=SIGNUP with correct OTP returns `data.token` + `data.user` shape (same as login response). Evidence: response JSON.

## Task 6: Compile and boot backend; verify health + endpoints + DB
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 1, 2, 3, 4, 5
- **Description**:
  - Run `mvnw.cmd clean compile` → capture BUILD SUCCESS.
  - If Flyway migration needs adjustment for `users` table (e.g., nullable mismatch), adjust entity `@Column` annotations to match the existing `V1__create_users_table.sql` exactly (do NOT add a new migration unless necessary — existing migration should already match current User entity; verify by booting and watching for `ddl-auto: validate` errors).
  - Start the backend via `mvnw.cmd spring-boot:run`; allow it to connect to PostgreSQL. If PostgreSQL is not available locally, document the exact connection failure as an environment blocker; the rest of the task can still be validated up to compile + endpoint definitions.
  - Hit `GET /api/health` → 200.
  - Confirm all auth endpoints respond (not 404): POST signup/login/forgot/verify/resend/reset, GET /me (401 without JWT is acceptable), POST /logout.
  - Read logs for authentication-related exceptions. Resolve any that appear on startup.
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `rule` TR-6.1: `mvnw.cmd clean compile` BUILD SUCCESS exit 0. Evidence: Maven log.
  - `rule` TR-6.2: Application startup log contains `Started SocietyoneBackendApplication` and `Netty started`/`Tomcat started` on port 8082, with no stack traces. If DB is unavailable, the clear single error is logged and we record the environment block. Evidence: startup tail.
  - `rule` TR-6.3: Health endpoint returns 200 + JSON status=up. Evidence: HTTP response.
  - `rule` TR-6.4: All seven auth endpoints return non-404 (business 200/400/401/403/409 acceptable). Evidence: status codes.

## Task 7: Frontend build and any contract tweaks
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 6
- **Description**:
  - Run `npm install` or equivalent if `node_modules` missing.
  - Run `npm run build` in `societyone-frontend/`.
  - If TypeScript errors arise due to auth type mismatches (SafeUserResponse `mobile` vs `mobileNumber`, `name` vs `fullName`), verify the actual mapping:
    - Backend `SafeUserResponse.name` = `user.getFullName()` — frontend `User.name` matches ✓
    - Backend `SafeUserResponse.mobile` = `user.getMobileNumber()` — frontend `User.mobile` matches ✓
    - Backend `SafeUserResponse` lacks `accountStatus` field on frontend User? Actually frontend type `User` doesn't declare `accountStatus`; it's OK because it's an extra field. Frontend auth store just stores what comes back.
  - If frontend `auth-service.signup` result union `AuthResult | {needsVerification, user}` conflicts with backend always returning JWT (since no OTP-at-signup is enforced yet), make no change: the frontend already handles both branches. Backend currently returns `AuthResponse` always; frontend `if ("needsVerification" in res)` branch is simply never taken. That is acceptable and intentional (no-op when OTP verification is optional). Leave it.
  - Do NOT add new demo/fallback users. No files to add.
- **Acceptance Criteria Addressed**: AC-11, AC-15
- **Test Requirements**:
  - `rule` TR-7.1: `npm run build` completes with exit 0; no TypeScript diagnostics. Evidence: build log.
  - `rule` TR-7.2: `services/index.ts` has no commented-out demo path for login that returns a mock user without hitting backend; verify `login→apiFetch("/auth/login")` genuinely runs. Evidence: static source review.
  - `rubric` TR-7.3: Non-regression on existing routes (dashboard layout renders without crashes after login). Dimension per AC-15; scale 1-5; anchors 1/3/5; threshold >= 4. Evidence: manual/headless console capture after simulated auth.

## Task 8: End-to-end scripted auth tests (backend running)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 6, 7
- **Description**:
  - Script a test sequence using `curl`/`Invoke-WebRequest` or a simple PowerShell script:
    1. Health check
    2. Signup new unique user EMAIL method
    3. Login (email) → get JWT
    4. /me with JWT → user profile
    5. Duplicate signup → 409 with specific code
    6. Wrong password login → 401
    7. Forgot password for user → note OTP from logs
    8. Reset password with OTP + new P2
    9. Login with P1 (old) → 401
    10. Login with P2 (new) → 200 new JWT
    11. GET /api/auth/me with no JWT → 401
    12. GET /api/auth/me with tampered token → 401
  - Save transcript.
  - For frontend: if a browser can be launched, perform the equivalent via UI and confirm navigation to /dashboard; sign out → localStorage cleared; protected route redirects to /login.
- **Acceptance Criteria Addressed**: AC-4, AC-5, AC-6, AC-7, AC-8, AC-12, AC-13, AC-14, AC-15
- **Test Requirements**:
  - `rule` TR-8.1: Steps 1-12 each match their expected status code + body fields (see acceptance criteria details). Evidence: full transcript.
  - `rule` TR-8.2: After logout, `localStorage.getItem("societyone.token.v1") === null`, dashboard `requireAuth` throws redirect to /login. Evidence: store state snapshot.
  - `rule` TR-8.3: After page reload simulation (re-run `restoreSession` with valid token, invalid token), auth state matches expected. Evidence: two state snapshots.
  - `rubric` TR-8.4: End-to-end user-perceivable flow works cleanly. Dimension: flow completeness (signup→login→dashboard→logout→login-with-new-password); scale 1-5 (1 = broken at 2+ steps, 3 = works but error strings are generic, 5 = works with specific copy); threshold >= 4. Evidence: flow transcript + error strings captured.
