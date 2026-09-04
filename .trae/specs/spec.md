# SocietyOne Authentication Integration - Product Requirements Document

## Overview
- **Summary**: Fix, complete, and end-to-end verify the existing SocietyOne authentication system across the Spring Boot backend and React frontend. The repository already contains auth entity skeletons, DTOs, a controller shell, JWT infrastructure, and a fully-designed frontend auth UI + service layer. The task is to make the broken pieces compile, run, and interoperate without introducing duplicate architecture.
- **Purpose**: SocietyOne (resident/visitor/security gate management) cannot ship unless users can sign up, log in, recover passwords, remain authenticated across refreshes, and hit protected endpoints with valid JWTs. Today the backend fails at compile time and runtime; several backend endpoints the frontend already calls do not exist.
- **Target Users**: Residents, visitors, security staff, and society admins who authenticate via the React web client against the Spring Boot API.

## Goals
- Backend compiles, boots, connects to PostgreSQL, and exposes all auth endpoints the frontend calls.
- Signup, email login, mobile login, `/me`, logout work end-to-end with real JWTs.
- Forgot-password → verify-OTP → reset-password flow works using a development-safe OTP mechanism (no external SMS/email required).
- Frontend never falls back to fake/demo users; real backend auth is the only path.
- No password is stored or returned in plaintext; no secret is hardcoded unsafely beyond existing dev configuration.
- All protected endpoints require a valid Bearer JWT and reject invalid/expired tokens with 401.
- CORS permits `http://localhost:5173` during development with credentials-aware header handling.
- Existing SocietyOne pages (dashboard, requests, invite, history, notifications, admin, security sections) continue to load and navigate without error after the fixes.

## Non-Goals
- Implementing real SMS or real email delivery. OTPs must be verifiable in dev without an external provider.
- Google OAuth end-to-end token exchange with Google's servers (the popup/postMessage scaffolding is preserved but out of scope for live credentials).
- Adding new user roles, new account statuses, or new database tables beyond what the migration already defines.
- Rewriting the frontend auth store, auth API client, route components, or TanStack Router setup (only fixing mismatches).
- Rewriting unrelated modules: society structure, visitor requests, notifications.

## Background & Context
**Repository layout discovered:**
- Backend: `societyone-backend/` — Maven, Spring Boot 4.1.1, Java 21, Spring Security, JPA, Flyway, PostgreSQL, jjwt 0.13.0.
- Frontend: `societyone-frontend/` — Vite, React 19, TypeScript 6, TanStack Router + Query, Radix UI, Tailwind v4, localStorage-based token + user cache.
- Database: PostgreSQL at `localhost:5432/societyone`, migration `V1__create_users_table.sql` defines `users(id BIGSERIAL PK, full_name, username UNIQUE, email UNIQUE nullable, mobile_number UNIQUE nullable, password_hash, role VARCHAR, account_status VARCHAR, email_verified, mobile_verified, created_at/updated_at timestamptz, last_login_at)`.
- Backend auth packages exist but are broken: `com.societyone.app.auth.entity.{User,Role,AccountStatus}`, `dto.{SignupRequest,LoginRequest,AuthResponse,SafeUserResponse}`, `repository.UserRepository` (EMPTY class — the #1 compilation blocker), `security.{JwtService,JwtAuthenticationFilter}`, `service.AuthService`, `controller.AuthController`. Common packages: `config.{SecurityConfig,PasswordConfig}`, `api.{ApiResponse,HealthController}`, `exception.GlobalExceptionHandler`.
- Frontend auth modules (designed to match a backend that currently fails): `lib/auth/{auth-api-client.ts (apiFetch + tokenStore + ApiEnvelope), auth-store.ts (in-memory + localStorage + restoreSession calls /auth/me), error-mapper.ts, intended-role.ts, password-validators.ts, require-auth.ts}`, routes `/login, /signup, /forgot-password, /reset-password, /verify-otp, /dashboard (beforeLoad: requireAuth)`, services `index.ts` (authService interface + methods calling apiFetch).

**Critical defects discovered during inspection:**
1. `UserRepository.java` is an empty class. It does not extend `JpaRepository<User, Long>` and has none of the methods AuthService and JwtAuthenticationFilter call (`findByUsernameIgnoreCase`, `findByEmailIgnoreCase`, `findByMobileNumber`, `existsByUsernameIgnoreCase`, `existsByEmailIgnoreCase`, `existsByMobileNumber`, `save`).
2. Controller exposes only `/signup, /login, /me, /logout`. Frontend additionally calls `/forgot-password`, `/reset-password`, `/verify-otp`, `/resend-otp`.
3. `SecurityConfig.permitAll()` does not list the forgot/reset/verify-otp/resend-otp endpoints.
4. Backend SignupRequest accepts `email + mobileNumber` without enforcing at least one is present; DB columns are nullable.
5. Password validation: frontend enforces uppercase + lowercase + digit + special + length ≥ 8; backend `@Size(min=8)` only. Username: frontend max 30 + pattern; backend 50 without pattern.
6. Error codes: frontend `KNOWN_CODES` expects `EMAIL_ALREADY_REGISTERED / MOBILE_ALREADY_REGISTERED / USERNAME_ALREADY_TAKEN / OTP_INVALID / OTP_EXPIRED`. Backend AuthService throws generic ResponseStatusException with code `CONFLICT` (from GlobalExceptionHandler), so the frontend's detailed user-facing strings are never triggered.
7. No OTP store or OTP service exists on the backend for the forgot-password / verify-otp / reset-password flow.
8. Login's `method` field is not validated against an allowed set.
9. application.yaml contains hardcoded DB password and JWT secret in source tree. (Left as-is per existing dev config; no new secrets are added to source.)

## Functional Requirements
- **FR-1 Signup email/mobile**: Backend accepts `SignupRequest` via `POST /api/auth/signup` and creates a `users` row with BCrypt-hashed password, role defaulted to `VISITOR` (ignoring `intendedRole`), status `ACTIVE`, timestamps set, username/email/mobile unique checks enforced using specific error codes the frontend maps. At least one of email or mobile must be provided.
- **FR-2 Login email**: `POST /api/auth/login` with `{method:"email", identifier, password}` → look up by email (case-insensitive), verify BCrypt, reject disabled/locked with 403, reject wrong password with 401, update `last_login_at`, return `{token, user}` wrapped in `ApiResponse.success`.
- **FR-3 Login mobile**: Same flow with `{method:"mobile", identifier}`; lookup by normalized mobile number.
- **FR-4 JWT issuance and validation**: `JwtService.generateToken(userId, username, role)` → signed HS256 JWT using configured Base64 secret; claims `sub=username`, `userId`, `role`, standard `iat/exp`. `JwtAuthenticationFilter` extracts `Authorization: Bearer <token>`, loads user, enforces `account_status=ACTIVE`, populates `SecurityContext` with `ROLE_<ROLE>` authority, otherwise passes through unauthenticated.
- **FR-5 /api/auth/me**: Protected GET returns `SafeUserResponse` for the authenticated principal; must not include password or hash.
- **FR-6 /api/auth/logout**: POST returns success; frontend is responsible for token removal (stateless).
- **FR-7 Forgot password**: `POST /api/auth/forgot-password {method, identifier}` → look up user, generate 6-digit OTP, store OTP with purpose `PASSWORD_RESET` and short TTL in an in-memory (ConcurrentHashMap-backed) OTP store; response `{identifier}`. In dev, OTP value is deterministically derivable/printable via server logs so the flow can be tested without email/SMS.
- **FR-8 Verify OTP**: `POST /api/auth/verify-otp {identifier, otp, purpose}` → validate OTP existence, match, non-expiry, correct purpose; return either `{verified:true}` (PASSWORD_RESET purpose → frontend goes to reset-password) or issue a session `{token, user}` (SIGNUP purpose). Specific error codes `OTP_INVALID`, `OTP_EXPIRED`.
- **FR-9 Resend OTP**: `POST /api/auth/resend-otp {identifier, purpose}` → regenerate/invalidate prior OTP for the same identifier+purpose; succeed silently.
- **FR-10 Reset password**: `POST /api/auth/reset-password {identifier, otp, newPassword}` → validate OTP purpose=PASSWORD_RESET, enforce password policy, BCrypt-hash new password, update `users.password_hash`, invalidate the consumed OTP, return success.
- **FR-11 Protected endpoint enforcement**: Any endpoint not in permitAll → 401 without JWT; 401 with expired/invalid JWT; 403 when role or account status forbids.
- **FR-12 Frontend session restore**: On app boot `authStore.restoreSession()` reads token+user from localStorage, then calls `GET /api/auth/me`; on 401/403 clears locally; on success refreshes the cached user. Protected route guard `requireAuth()` redirects to `/login` when unauthenticated.
- **FR-13 Error contract**: `GlobalExceptionHandler` wraps every error as `ApiResponse.failure(code, message, details?)` with the exact `code` strings frontend `KNOWN_CODES` uses where applicable; validation errors retain field-level `details`.
- **FR-14 CORS**: `SecurityConfig.corsConfigurationSource` allows `http://localhost:5173`, methods GET/POST/PUT/PATCH/DELETE/OPTIONS, headers `Authorization, Content-Type, Accept`, exposes `Authorization`, and is configured so preflight succeeds before auth filters run.
- **FR-15 Demo/fallback neutrality**: The frontend `authService.login/signup/forgotPassword/resetPassword/verifyOtp` paths genuinely hit the backend and surface backend errors rather than returning mock success (verified by actually running them). No new mock fallback users are introduced.

## Non-Functional Requirements
- **NFR-1 Compilability**: Backend `mvnw.cmd clean compile` exits 0; frontend `npm run build` (tsc + vite build) exits 0.
- **NFR-2 Bootability**: Backend starts on port 8082 with a healthy database connection or fails with a clear single error; Flyway migration runs cleanly against an empty/schema-present DB.
- **NFR-3 Security**: No plaintext password in logs, API responses, or stack traces; BCrypt strength default (10 via default PasswordEncoder).
- **NFR-4 Consistency**: Backend ↔ Frontend field names match exactly (`method`, `identifier`, `fullName`, `username`, `email`, `mobileNumber`, `intendedRole` on signup; `token`, `user.{id,name,username,email,mobile,role,accountStatus,lastLoginAt}` on auth responses).
- **NFR-5 Non-regression**: All existing non-auth frontend routes (`/dashboard`, `/invite`, `/requests`, `/history`, `/notifications`, `/security/*`, `/admin/*`) load their layout without throwing; the `AppShell` navigation renders for a logged-in user.

## Constraints
- **Technical**: Backend uses Java 21, Spring Boot 4.1.1, Spring Security filter chain; must not replace Spring Security with a custom auth framework. Frontend must keep existing `authStore`, `auth-api-client`, `services/index.ts` architecture — no migration to Zustand/Axios/etc.
- **Business**: Public signup always creates `VISITOR` role (never trust `intendedRole` from the client). `SECURITY`/`ADMIN` accounts are created by society out-of-band (consistent with signup page UI copy).
- **Dependencies**: Must not add new Maven/npm packages; existing jjwt 0.13.0, BCrypt, Flyway, PostgreSQL, React 19, TanStack Router are sufficient.

## Assumptions
- PostgreSQL is reachable at `localhost:5432/societyone` with credentials in `application.yaml`, and the user can create schemas/tables (Flyway `V1` will apply). If DB is unreachable during testing, that is recorded as an environment blocker, not an implementation defect.
- No production email/SMS gateway is configured; OTPs are either logged server-side or a well-known dev value.
- The `application.yaml` secret and DB password are pre-existing dev configuration; the fix does NOT move them out of source control during this task (documented as a hardening recommendation only).

## Acceptance Criteria

### AC-1: Backend compiles successfully
- **Type**: `rule`
- **Given**: A clean checkout of the repository with JDK 21 and Maven wrapper available.
- **When**: Running `mvnw.cmd clean compile` from `societyone-backend/`.
- **Then**: Maven exits with code 0 and prints `BUILD SUCCESS`.
- **Pass Condition**: Exit code 0 + BUILD SUCCESS string in stdout.
- **Evidence**: Terminal output of the compile command captured in task completion.

### AC-2: Backend boots and exposes endpoints
- **Type**: `rule`
- **Given**: PostgreSQL reachable and schema ready (or Flyway creating it).
- **When**: Running the Spring Boot app and hitting `GET /api/health`.
- **Then**: Response `200 OK` with body including `{"status":"up"}`; `GET /api/auth/login` without auth → 405 or protected as expected; `POST /api/auth/signup|login|forgot-password|verify-otp|reset-password|resend-otp` return JSON responses (not 404).
- **Pass Condition**: All listed endpoints respond; no 404 for any auth endpoint the frontend calls.
- **Evidence**: curl/Invoke-WebRequest transcript against running backend.

### AC-3: UserRepository has the required JPA methods
- **Type**: `rule`
- **Given**: The backend source tree.
- **When**: Inspecting `UserRepository.java`.
- **Then**: It extends `JpaRepository<User, Long>` and declares `findByUsernameIgnoreCase`, `findByEmailIgnoreCase`, `findByMobileNumber`, `existsByUsernameIgnoreCase`, `existsByEmailIgnoreCase`, `existsByMobileNumber` (either derived queries or explicit JPQL).
- **Pass Condition**: All six methods resolve for `AuthService` and `JwtAuthenticationFilter` call sites.
- **Evidence**: Static code inspection + compilation success.

### AC-4: Signup correctly creates a user with hashed password and correct error codes
- **Type**: `rule`
- **Given**: Empty users table.
- **When**: POST `/api/auth/signup` with a valid payload including email + valid password; then repeat the same username; then repeat the same email; then with neither email nor mobile.
- **Then**: First call → 200, `success=true`, `data.token` non-empty, `data.user.role=="VISITOR"`, DB row `password_hash` begins with `$2a$`/`$2b$` and does NOT equal the input; duplicates → 409 body with code exactly `USERNAME_ALREADY_TAKEN` then `EMAIL_ALREADY_REGISTERED`; missing both identifiers → 400 `VALIDATION_ERROR`.
- **Pass Condition**: All four sub-cases behave as specified.
- **Evidence**: HTTP request/response pairs + DB query showing hash prefix.

### AC-5: Login (email and mobile) returns JWT and rejects invalid credentials
- **Type**: `rule`
- **Given**: A valid user created via signup (with known email, mobile, password).
- **When**: (a) POST login by correct email + correct password; (b) POST login by correct mobile + correct password; (c) POST login by correct email + wrong password; (d) POST login with account_status set to LOCKED (by direct DB update) + correct password.
- **Then**: (a, b) → 200, `data.token` valid JWT whose payload includes `userId`, `role`, matching username as sub; (c) → 401 code `UNAUTHORIZED` or `INVALID_CREDENTIALS`; (d) → 403 code `FORBIDDEN` message "Account is not active".
- **Pass Condition**: All four sub-cases pass.
- **Evidence**: Request/response + decoded JWT claims dump.

### AC-6: JWT filter authenticates /me and rejects invalid tokens
- **Type**: `rule`
- **Given**: A valid JWT from login.
- **When**: `GET /api/auth/me` with (a) `Bearer <valid>`; (b) no Authorization header; (c) `Bearer garbage`; (d) an expired/tampered JWT.
- **Then**: (a) → 200 `SafeUserResponse` excluding password fields, `id` matches the user; (b, c, d) → 401/403 with `ApiResponse.failure` envelope.
- **Pass Condition**: All four sub-cases pass.
- **Evidence**: Four request/response pairs.

### AC-7: Forgot-password → verify-otp → reset-password flow succeeds, old password fails
- **Type**: `rule`
- **Given**: Existing user, known email, current password P1.
- **When**: POST `/forgot-password` → obtain OTP from server log → POST `/verify-otp` → POST `/reset-password` with OTP + new password P2; then login with P1; then login with P2.
- **Then**: Forgot → 200 `{identifier}`; verify → 200 `{verified:true}` (PASSWORD_RESET purpose); reset → 200 success; P1 login → 401; P2 login → 200 with JWT.
- **Pass Condition**: End-to-end password change sequence works; old password rejected; new accepted.
- **Evidence**: Full request/response sequence + two final login attempts.

### AC-8: OTP produces correct error codes for invalid/expired/consumed scenarios
- **Type**: `rule`
- **Given**: OTP generated for identifier=X purpose=PASSWORD_RESET.
- **When**: (a) Verify with wrong 6-digit value; (b) Verify after TTL (simulate via clock or manual expiry in code after TTL); (c) Verify correct OTP → succeed → verify same OTP again.
- **Then**: (a) → 400/401 body with code exactly `OTP_INVALID`; (b) → code exactly `OTP_EXPIRED`; (c) → second verify returns `OTP_INVALID` (one-time consumption enforced).
- **Pass Condition**: Exact code strings match frontend KNOWN_CODES.
- **Evidence**: Three response bodies.

### AC-9: Security permitAll covers all public auth endpoints
- **Type**: `rule`
- **Given**: No JWT.
- **When**: OPTIONS and POST to `/api/auth/signup`, `/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/verify-otp`, `/api/auth/resend-otp`; also `/api/health`.
- **Then**: None return 401 due to missing JWT. OPTIONS succeeds; POST returns a business-level response (e.g., validation errors are OK).
- **Pass Condition**: Seven endpoints are reachable unauthenticated.
- **Evidence**: Response status codes.

### AC-10: CORS preflight succeeds from http://localhost:5173
- **Type**: `rule`
- **Given**: Backend running.
- **When**: Sending `OPTIONS /api/auth/login` with `Origin: http://localhost:5173`, `Access-Control-Request-Method: POST`, `Access-Control-Request-Headers: authorization,content-type`.
- **Then**: Response 200 includes `Access-Control-Allow-Origin: http://localhost:5173`, allow methods covers POST, allow headers covers `authorization,content-type`.
- **Pass Condition**: All three CORS headers present with expected values.
- **Evidence**: OPTIONS response headers capture.

### AC-11: Frontend builds without TypeScript errors
- **Type**: `rule`
- **Given**: Node/npm installed.
- **When**: Running `npm install` (if needed) then `npm run build` from `societyone-frontend/`.
- **Then**: Exits 0; no `error TS` lines in output.
- **Pass Condition**: Exit 0, clean tsc+vite build.
- **Evidence**: Build log.

### AC-12: Frontend session restore on refresh keeps authenticated user
- **Type**: `rule`
- **Given**: Browser with a valid token + user in localStorage after real login.
- **When**: Reloading the application (simulate by rerunning `authStore.restoreSession()` and inspecting state; or actual browser refresh).
- **Then**: `isAuthenticated` becomes true; `/api/auth/me` is called; if the token is still valid the user object is refreshed; if backend returns 401 the state is cleared. Protected guard `requireAuth()` returns authenticated=true before dashboard route renders.
- **Pass Condition**: State transitions and backend call sequence match.
- **Evidence**: authStore state snapshots + network tab HAR or fetch logging.

### AC-13: Logout clears frontend state and blocks protected navigation
- **Type**: `rule`
- **Given**: Authenticated session.
- **When**: Call `authService.logout()`, then attempt navigate to `/dashboard`, then attempt `GET /api/auth/me` with the old token (just to confirm server treats it as a normal call).
- **Then**: authStore `isAuthenticated=false`, `token=null`, localStorage `societyone.token.v1` and `societyone.user.v1` removed; `requireAuth()` redirects → `/login`; /me with the removed token from outside the app still works (stateless) but the frontend no longer sends it — confirmed by checking tokenStore.get() === null after logout.
- **Pass Condition**: All client-side expectations hold.
- **Evidence**: Store state + localStorage reads.

### AC-14: Duplicate signup rejects with correct frontend user-facing message
- **Type**: `rubric`
- **Dimension**: Correctness of end-to-end error propagation backend→frontend
- **Scale**: 1-5
- **Anchors**: 1 = frontend shows generic "Something went wrong"; 3 = frontend shows 409-level copy but not the specific field string; 5 = frontend shows exactly "Username already taken." / "Email already registered." / "Mobile number already registered." driven by exact backend code.
- **Pass Threshold**: >= 4
- **Evidence**: Three attempts (duplicate username, duplicate email, duplicate mobile) with screenshots or console error.code values.

### AC-15: No unrelated SocietyOne pages break
- **Type**: `rubric`
- **Dimension**: Non-regression quality of existing routes post-auth-fix
- **Scale**: 1-5
- **Anchors**: 1 = dashboard crashes on render; 3 = dashboard renders but nav items / notifications throw in console; 5 = dashboard, requests, invite, history, notifications, role-based sidebar all render cleanly with the authenticated user's role, no React error boundaries, no console errors originating from auth state.
- **Pass Threshold**: >= 4
- **Evidence**: Browser console log capture after load of dashboard route + navigation through two secondary routes.

## Open Questions
- [ ] Is PostgreSQL currently running on the environment with the credentials in `application.yaml`? If not, we will boot the backend and note DB connection failure as an environment blocker rather than an implementation failure.
- [ ] Should the OTP TTL for password reset be 5 minutes or 15 minutes? Assumption: 5 minutes with server log printing of OTP value for dev.
- [ ] Should the backend also enforce the password regex (upper/lower/digit/special) currently only enforced in frontend? Assumption: yes, for defense-in-depth.
