# SocietyOne Backend Completion — Specification

## Overview
- **Summary**: Complete the existing Spring Boot backend for the SocietyOne residential society management system. The backend already has authentication, society structure (Society→Building→Floor→Flat), skeleton resident/security/visitor modules, and 5 Flyway migrations. All remaining work must harden these modules, add a real Audit system, a real Notification system, Dashboard APIs, proper validation, society isolation, and end-to-end compilation + test verification.
- **Purpose**: The SocietyOne frontend calls backend APIs that are currently either stubbed, unguarded, authorization-weak, or backed entirely by in-memory demo data. The backend must become production-ready so the frontend can work against real database-backed data only.
- **Target Users**: Backend engineers maintaining SocietyOne; frontend apps used by ADMIN, SECURITY, RESIDENT, and VISITOR roles.

## Goals
- Harden Resident Management: admin-only assignment, role promotion, society ownership checks, flat validation, duplicate resident prevention, status toggling, correct list/get semantics.
- Finish Security Staff management: activate/deactivate endpoint, enum status type, society isolation, password policy validation.
- Harden Visitor Management: fix the workflow to match the documented state machine (PENDING_RESIDENT → APPROVED_BY_RESIDENT → PENDING_SECURITY → ACCEPTED_BY_SECURITY → WAITING_AT_GATE → CHECKED_IN → CHECKED_OUT), fix security actor validation bug, add role-aware list requests, add visitor GET endpoints, add cancellation where appropriate, strict state-transition enforcement.
- Add real database-backed Audit Log system with entity/repo/DTO/service/controller, Flyway V6, recording of all listed audit actions, society isolation, correct HTTP endpoints.
- Add real database-backed Notification system with entity/repo/DTO/service/controller, Flyway V7 (or V6-part2), endpoints GET list / PATCH read / PATCH read-all, automatic notification creation on workflow events, strict user isolation.
- Expose real Dashboard APIs that the frontend `societyService.getSummary(role)` and `visitorService.listRequests(role)` call, returning actual DB counts per role.
- Ensure robust Validation and Error Handling using @Valid, Bean Validation, existing ApiResponse/GlobalExceptionHandler, meaningful HTTP status codes, and explicit error codes for USER_NOT_FOUND / FLAT_NOT_FOUND / RESIDENT_NOT_FOUND / VISITOR_NOT_FOUND / REQUEST_NOT_FOUND / FORBIDDEN / INVALID_STATE_TRANSITION / DUPLICATE_RESIDENT / DUPLICATE_SECURITY_STAFF.
- Enforce Society Isolation on every society-scoped resource: Admin cannot see another society's data; Security staff only access their society; Residents only access their flat/requests. Never trust client-supplied societyId/flatId/residentId/userId without re-verifying ownership.
- Review Database Quality: keep existing V1–V5 intact; add new V6/V7 migrations only (no destructive edits); ensure proper FKs, indexes, NOT NULL, unique constraints, CHECK constraints, correct ON DELETE, timestamps.
- Run `mvn clean test` and `mvn spring-boot:run`; verify startup; manually exercise the 21 test actions listed in Phase 10. Resolve all compilation/runtime failures.
- Maintain Code Quality: constructor injection; thin controllers; services own all business logic; no CurrentUser bean injection; reuse User.setPasswordHash() and existing conventions.

## Non-Goals
- Do NOT rewrite authentication, signup, login, JWT, OTP, first-admin bootstrap. All exist and must work unchanged.
- Do NOT modify already-applied Flyway migrations V1–V5 in any destructive way. Only add new V6/V7.
- Do NOT add fake/demo/in-memory data anywhere in new backend code.
- Do NOT add Google OAuth backend endpoints (frontend popup scaffolding only; out of scope).
- Do NOT move JWT secret or DB password out of application.yaml (documented as dev config; preserved).
- Do NOT create a separate User factory public method; inline user creation in SecurityStaffService/ResidentService with consistent logic mirroring AuthService.createUser() semantics (role, accountStatus, BCrypt hash).
- Do NOT change the REST shape of existing working endpoints the frontend already calls. Add new endpoints; extend existing ones only when strictly necessary to preserve non-regression.

## Background & Context
### Repository
- Backend: `societyone-backend/` — Spring Boot 4.1.1, Java 21, Spring Security, Spring Data JPA, Flyway, PostgreSQL, jjwt 0.13.0, BCrypt.
- Frontend: `societyone-frontend/` — React 19 + TanStack Router/Query + Vite + TypeScript. All `services/index.ts` `authService`, `residentService`, `securityStaffService` already hit real backend URLs; `visitorService`, `notificationService`, `auditService`, and `societyService.getSummary` return demo data as of this writing.

### Key Defects Discovered During Phase 0
1. **ResidentService / ResidentController** — No role guard, no society ownership check, does not promote the assigned user to `Role.RESIDENT`, no "list residents for admin's society" endpoint, duplicate `userId` in @RequestParam + DTO, flat not validated against admin's society.
2. **SecurityStaffProfile.status** is a bare `String`; everything else uses an enum (ResidentStatus). Need `SecurityStaffStatus` enum + DB column check constraint.
3. **Security Staff** missing `PATCH /api/security-staff/{id}/status` activate/deactivate endpoint.
4. **VisitorService.validateActorAccess()** bug for `Role.SECURITY`: compares `actor.getId()` to `resident.getId()`, which cannot possibly work. Should check the security staff's assigned society matches the request society.
5. **Visitor workflow state machine**: Current code skips `PENDING_SECURITY` between `APPROVED_BY_RESIDENT` and `ACCEPTED_BY_SECURITY`. The documented workflow in the task requires the intermediate state. `initialRequestStatus` also needs review: `RESIDENT` source should self-approve and go to `PENDING_SECURITY`.
6. **Visitor list requests**: `listRequests` endpoint only calls `listForAdmin`; RESIDENT and SECURITY roles cannot list their own applicable requests. No GET `/api/visitors` or GET `/api/visitors/{id}`.
7. **Audit**: Zero backend. Frontend `auditService.list()` returns in-memory `auditEvents`.
8. **Notifications**: Zero backend. Frontend `notificationService.list(role)` and `markRead(id)` operate on `notificationSeed`. Frontend expects Notification shape: `{id, title, description, type: REQUEST|APPROVAL|ENTRY|EXIT|SYSTEM, timestamp, read, requestId?}`.
9. **Dashboard**: `societyService.getSummary(role)` returns hardcoded role-based DashboardSummary arrays. `visitorService.listRequests(role)` returns hardcoded `requests`. Need real endpoints.
10. **Error codes**: GlobalExceptionHandler lacks mappings for resident/security/visitor/audit/notification domain errors (USER_NOT_FOUND, FLAT_NOT_FOUND, INVALID_STATE_TRANSITION, etc.).
11. **Society isolation holes**: Resident and security endpoints return data for any ID supplied without checking the authenticated admin owns the society.

### Existing Completed Work (Must Preserve)
- Auth: User/Role/AccountStatus, JWT filter + service, login, signup, /me, logout, forgot/reset/verify/resend OTP, BCrypt, first-admin bootstrap.
- Society structure: Society → Building → Floor → Flat hierarchy, create/update/list controllers with ADMIN guards, ownership checks.
- Security Staff: POST + GET list + GET by id endpoints already compile + work (but missing status update and enum type).
- Resident DB: ResidentProfile/ResidentType/ResidentStatus entities + skeleton service/controller (unguarded).
- Visitor DB: Visitor, VisitRequest, enums, all workflow endpoints exist (but buggy + weak authorization).
- Flyway migrations V1 through V5 currently exist; entities and `ddl-auto: validate` must align.

## Functional Requirements

### Phase 1 — Harden Resident Management
- **FR-1 Admin list residents**: `GET /api/residents` returns all ResidentProfiles for the authenticated ADMIN's society. Scoped to society ownership (NOT all residents in DB).
- **FR-2 Admin get resident**: `GET /api/residents/{residentId}` returns a single resident, scoped so ADMIN can only get residents of their society; RESIDENT can get their OWN profile; SECURITY can get any resident in their society.
- **FR-3 Admin assign user to flat with type**: Modify `POST /api/residents?userId=<userId>` body `{flatId, residentType}` → creates ResidentProfile if: user exists, flat exists, flat belongs to admin's society, user has no existing ResidentProfile, promotes user role to RESIDENT (and accountStatus ACTIVE if not locked), residentType in {OWNER, TENANT, FAMILY_MEMBER}.
- **FR-4 Admin activate/deactivate**: `PATCH /api/residents/{residentId}/status?status=ACTIVE|INACTIVE` updates ResidentStatus; scoped to same society admin; also toggles the underlying User.accountStatus to ACTIVE/INACTIVE so JWT filter rejects INACTIVE residents on login.
- **FR-5 Role guard**: Only ADMIN can create/update residents. RESIDENT and SECURITY cannot promote anyone.
- **FR-6 DTO safety**: ResidentResponse never includes passwordHash; mirrors existing ResidentResponse fields.

### Phase 2 — Complete Security Staff
- **FR-7 Security staff status enum**: Change `SecurityStaffProfile.status` from String to new enum `SecurityStaffStatus { ACTIVE, INACTIVE }`; existing values convert cleanly.
- **FR-8 Admin activate/deactivate**: Add `PATCH /api/security-staff/{id}/status?status=ACTIVE|INACTIVE` that updates the profile enum AND the underlying User.accountStatus so JWT respects it.
- **FR-9 Validation on create**: username/email/mobile uniqueness (already present); password policy compliance (mirror AuthService.passwordMeetsPolicy: ≥8 chars, upper+lower+digit+special); status default ACTIVE and role=SECURITY and accountStatus=ACTIVE.
- **FR-10 Society isolation**: Security staff can only see and work within their assigned society (profile → society link verified).

### Phase 3 — Harden Visitor Management
- **FR-11 Corrected workflow state machine**:
  - VISITOR source → `PENDING_RESIDENT` / `EXPECTED`.
  - RESIDENT source → since resident is creating for themselves, auto-approve → `PENDING_SECURITY` / `EXPECTED` (not initial `PENDING_RESIDENT`).
  - SECURITY source → `PENDING_RESIDENT` / `EXPECTED`.
  - Resident approve: `PENDING_RESIDENT` → `APPROVED_BY_RESIDENT` → `PENDING_SECURITY` (auto advance to pending security as a single transaction; set requestStatus to PENDING_SECURITY).
  - Resident reject: `PENDING_RESIDENT` → `REJECTED_BY_RESIDENT` + `CANCELLED`.
  - Security accept: `PENDING_SECURITY` → `ACCEPTED_BY_SECURITY` + `WAITING_AT_GATE`.
  - Security reject: `PENDING_SECURITY` → `REJECTED_BY_SECURITY` + `CANCELLED`.
  - Check-in: `ACCEPTED_BY_SECURITY` + `WAITING_AT_GATE` → `CHECKED_IN` (requestStatus stays ACCEPTED_BY_SECURITY).
  - Check-out: `CHECKED_IN` → `CHECKED_OUT`.
  - Any other transition → 400 `INVALID_STATE_TRANSITION`.
- **FR-12 Fix security actor validation bug**: In validateActorAccess for SECURITY and in security-gated endpoints (accept/reject/check-in/check-out), look up `SecurityStaffProfile` for the actor and verify profile.society.id equals request.society.id, not resident.id.
- **FR-13 Role-aware list requests**: `GET /api/visitors/requests` dispatches:
  - ADMIN → all requests for admin's society (existing listForAdmin).
  - RESIDENT → all requests where residentId = current resident (own requests).
  - SECURITY → all requests for security's society.
  - VISITOR → requests where the visitor's mobile matches? Or 403. (Current frontend does not use visitor role for request list; default forbid to be safe.)
- **FR-14 Visitor read endpoints**: `GET /api/visitors` (list, admin/security by society; resident can list visitors tied to their flat's requests), `GET /api/visitors/{id}` (same scoping).
- **FR-15 Cancellation**: Allow a RESIDENT who owns the request to cancel an EXPECTED/PENDING_SECURITY request → requestStatus stays, visitStatus CANCELLED. 400 if already checked in/out.

### Phase 4 — Real Audit System
- **FR-16 V6 migration for audit_logs**: Columns id (BIGSERIAL PK), actor_user_id BIGINT FK users(id) ON DELETE SET NULL, society_id BIGINT FK societies(id) ON DELETE CASCADE, action VARCHAR(50) NOT NULL, entity_type VARCHAR(50), entity_id BIGINT, description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP. Indexes on (society_id, created_at DESC), (actor_user_id), (action), (entity_type, entity_id). CHECK action in controlled list.
- **FR-17 Audit entities**: `audit/entity/AuditLog.java` entity; enum `AuditAction { AUTH_LOGIN, SOCIETY_CREATED, SOCIETY_UPDATED, BUILDING_CREATED, BUILDING_UPDATED, FLOOR_CREATED, FLOOR_UPDATED, FLAT_CREATED, FLAT_UPDATED, RESIDENT_CREATED, RESIDENT_STATUS_CHANGED, SECURITY_STAFF_CREATED, SECURITY_STAFF_STATUS_CHANGED, VISITOR_CREATED, VISIT_REQUEST_CREATED, VISIT_APPROVED, VISIT_REJECTED, SECURITY_ACCEPTED, SECURITY_REJECTED, VISITOR_CHECKED_IN, VISITOR_CHECKED_OUT }`.
- **FR-18 Audit components**: AuditLogRepository extends JpaRepository; AuditLogResponse DTO; AuditService that records entries (returns void, throws only on catastrophic persistence failure, never bubbles to business call); AuditController at `/api/audit` with `GET /api/audit` (list, scoped to society for ADMIN, 403 for others) and `GET /api/audit/{id}` (same scoping).
- **FR-19 Recording**: Every listed action fires an audit record from the corresponding service method (wrapped inside same transaction where possible via `@Transactional` + direct service call). Society must be populated on the AuditLog for every society-scoped action.

### Phase 5 — Real Notification Backend
- **FR-20 V7 migration for notifications**: `notifications(id BIGSERIAL PK, recipient_user_id BIGINT NOT NULL FK users(id) ON DELETE CASCADE, society_id BIGINT FK societies(id) ON DELETE CASCADE, type VARCHAR(30) NOT NULL, title VARCHAR(200) NOT NULL, message TEXT NOT NULL, read BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, request_id BIGINT FK visit_requests(id) ON DELETE SET NULL). Indexes on (recipient_user_id, created_at DESC), (society_id), (read). CHECK type IN ('REQUEST','APPROVAL','REJECTION','ENTRY','EXIT','SYSTEM').`
- **FR-21 Notification components**: entity/Notification.java, NotificationRepository, DTOs NotificationResponse, endpoints `GET /api/notifications` (user's own notifications, ordered by created_at DESC), `PATCH /api/notifications/{id}/read` (marks single read), `PATCH /api/notifications/read-all` (marks all unread → read for current user).
- **FR-22 Automatic notifications from workflow**:
  - Request created → recipient=resident → type=REQUEST, title "New visitor request", description describes visitor/flat/purpose.
  - Resident approves → recipient=security staff of society (broadcast: all ACTIVE security in that society) → type=APPROVAL.
  - Resident rejects → recipient=resident self + original request creator user if known → type=REJECTION.
  - Security accepts → type=APPROVAL to resident.
  - Security rejects → type=REJECTION to resident.
  - Check-in → type=ENTRY to resident.
  - Check-out → type=EXIT to resident.

### Phase 6 — Admin Data / Dashboard APIs
- **FR-23 Dashboard summary endpoint**: `GET /api/societies/summary` → returns `List<DashboardSummaryResponse>` based on the caller's role, computed from DB:
  - ADMIN: {totalResidents, totalFlats, totalSecurityStaff, visitorsToday, pendingRequests, checkedInVisitors, checkedOutVisitors} with labels matching frontend's 4 tiles.
  - RESIDENT: {todayVisitors, pendingRequests, activeVisits, regularVisitors} with counts.
  - SECURITY: {expectedToday, waitingAtGate, inside, exitsToday}.
  - VISITOR: {upcomingVisits, pendingRequests, approvedVisits, visitHistory}.
  Each tile returned as `{label, value, helper, tone}` matching `DashboardSummary` TS type.
- **FR-24 Role-aware request list endpoint**: `GET /api/visitors/requests` behavior from FR-13 doubles as the dashboard request list feed (up to 3 per role shown on dashboard; full list on `/requests` page).

### Phase 7 — Validation / Error Handling
- **FR-25 Validation**: Every controller DTO parameter uses `@Valid`. Add missing `@NotBlank`, `@Size`, `@NotNull` to ResidentCreateRequest/VisitRequestCreateRequest/SecurityStaffCreateRequest where absent. Add password policy inline checks for any endpoint that accepts a cleartext password (security-staff create).
- **FR-26 Error codes in GlobalExceptionHandler**: Extend handleResponseStatusException to produce codes:
  - USER_NOT_FOUND (404), FLAT_NOT_FOUND (404), RESIDENT_NOT_FOUND (404), SECURITY_STAFF_NOT_FOUND (404), VISITOR_NOT_FOUND (404), REQUEST_NOT_FOUND (404),
  - FORBIDDEN (403, already present),
  - INVALID_STATE_TRANSITION (400),
  - DUPLICATE_RESIDENT (409),
  - DUPLICATE_SECURITY_STAFF (409),
  - WEAK_PASSWORD (400).
- **FR-27 Safety**: Never return passwordHash, passwords, JWT secret, stack traces.

### Phase 8 — Society Isolation
- **FR-28 Cross-society forbidden everywhere**: For every endpoint accepting an ID that references a society-owned resource (resident, security staff, flat, building, floor, visit request, visitor, audit log), verify the caller's society relationship matches. On mismatch, return 404 (or 403, consistently with existing code that returns 404 for owned-resource misses).
- **FR-29 Admin A ≠ Society B**: Explicitly tested in Phase 10.

### Phase 9 — Database Quality
- **FR-30 V6/V7 migrations only**: No edits to V1–V5. All schema additions in V6 (audit) and V7 (notifications). If SecurityStaffProfile.status needs a type change from VARCHAR to strict enum, do it with a new Flyway V8__security_staff_status_enum.sql that rewrites the column and adds a CHECK constraint; or simply add a CHECK constraint in the same migration and keep the Java entity enum mapped by name to VARCHAR (simplest).

### Phase 10 — Testing (see ACs for evidence)
- **FR-31 Maven**: `mvn clean test` passes (even if contextLoads is the only test, no compilation/runtime failures).
- **FR-32 Boot**: `mvn spring-boot:run` starts cleanly, context loads, Flyway applies V1–V7 (V8 if needed).

## Constraints
- Modify existing classes only; do NOT duplicate existing entities/repos/services/controllers/DTOs.
- CurrentUser is static utility (class); never inject as Spring bean. Pattern: `User actor = CurrentUser.require(authentication);`.
- Use `User.setPasswordHash(...)` — there is no `setPassword` setter on the entity.
- `SocietyRepository.findByOwnerOrderByNameAsc(User owner)` exists; there is no `findByOwnerId(Long id)`.
- Flat getter is `flat.getNumber()` not `getFlatNumber()`.
- `spring.jpa.hibernate.ddl-auto=validate`; every entity field must match its Flyway column or the app won't boot.
- All new code lives under `com.societyone.app.<module>/` consistent with existing package layout (auth, common, resident, security, society, visitor). New audit/notification/dashboard modules follow the same pattern (audit/entity/repo/dto/service/controller + notification/… + dashboard/… optional).

## Acceptance Criteria

### AC-1 Resident Management hardened
- **Type**: `rule`
- **Given**: Authenticated ADMIN JWT for admin of society S1; user U1 exists and is not a resident; flat F1 in S1.
- **When**: POST /api/residents?userId=U1 with body {flatId: F1, residentType: OWNER}.
- **Then**: ResidentProfile row created, User.role = RESIDENT, accountStatus ACTIVE. GET /api/residents returns U1. PATCH status → INACTIVE removes User.accountStatus ACTIVE (JWT rejects). Same call for flat in S2 (other society) → 403/404 FORBIDDEN.
- **Evidence**: HTTP request/response pairs + DB select confirming role=RESIDENT.

### AC-2 Security Staff completed
- **Type**: `rule`
- **Given**: ADMIN JWT; society S has security staff S1 with ACTIVE profile.
- **When**: PATCH /api/security-staff/S1/status status=INACTIVE; then login as S1.
- **Then**: Security status DB row INACTIVE; User.accountStatus INACTIVE; login returns 403 "Account is not active". Weak password on create returns 400 WEAK_PASSWORD. Email/username/mobile duplicates return 409.
- **Evidence**: Two PATCH attempts + login attempts + DB select.

### AC-3 Visitor state machine matches documented workflow with no invalid transitions
- **Type**: `rule`
- **Given**: A fresh VisitRequest created by a VISITOR source.
- **When**: Attempt transitions in order: (1) resident approve → (2) security accept → (3) check-in → (4) check-out. Then attempt a bad transition (e.g., check-in on a CHECKED_OUT).
- **Then**: After step 1 requestStatus=PENDING_SECURITY; step 2 requestStatus=ACCEPTED_BY_SECURITY, visitStatus=WAITING_AT_GATE; step 3 CHECKED_IN; step 4 CHECKED_OUT; bad transition → 400 INVALID_STATE_TRANSITION.
- **Evidence**: Ordered HTTP calls + each response body showing exact status enum + final invalid transition 400.

### AC-4 SECURITY actor validation fixed (security actor cannot access another society)
- **Type**: `rule`
- **Given**: Security staff SEC-A from society A; a visit request in society B.
- **When**: SEC-A calls PATCH /requests/{B-id}/security/accept with their valid JWT.
- **Then**: 403 FORBIDDEN. No DB mutation. Same for reject/check-in/check-out.
- **Evidence**: Two calls (accept attempt + check-in attempt) both returning 403.

### AC-5 Role-aware /visitors/requests returns correct slice per role
- **Type**: `rule`
- **Given**: ADMIN, RESIDENT Rajesh, SECURITY Meena from same society; 3 total requests: 2 for Rajesh's flat, 1 for another flat.
- **When**: Each role calls GET /visitors/requests.
- **Then**: ADMIN → 3 items; RESIDENT → 2 items (own flat only); SECURITY → 3 items (all society). VISITOR role → 403.
- **Evidence**: 4 HTTP responses showing list lengths.

### AC-6 Visitor GET endpoints exist and respect isolation
- **Type**: `rule`
- **Given**: Visitor V1 tied to a request in society A.
- **When**: GET /api/visitors and GET /api/visitors/V1 by ADMIN of A; then same by ADMIN of B.
- **Then**: A sees V1; B sees 404 for by-id and empty list for list.
- **Evidence**: Four HTTP responses.

### AC-7 Audit Log database-backed with correct recording
- **Type**: `rule`
- **Given**: Clean audit_logs table; perform 5 actions: admin login (recorded in login flow), create society, create building, create resident, approve visitor request, security accept, check-in, check-out.
- **Then**: GET /api/audit (admin) contains exactly N new rows (one per recorded action); each has society_id = admin's society; GET /api/audit/{id} by another admin's JWT → 404.
- **Evidence**: SELECT audit_logs count + HTTP list response + cross-admin by-id 404 response.

### AC-8 Notifications database-backed and auto-created on workflow
- **Type**: `rule`
- **Given**: Clean notifications table; resident, security staff, visit request created.
- **When**: Run request→approve→accept→check-in→check-out sequence.
- **Then**: Resident receives REQUEST then APPROVAL then ENTRY then EXIT notification; security staff receives APPROVAL notification. GET /api/notifications returns them in desc order; PATCH /notifications/{id}/read marks one read; PATCH /notifications/read-all marks all read. User A cannot see User B's notifications.
- **Evidence**: Notifications table row counts + endpoints responses + cross-user 404.

### AC-9 Dashboard summary returns real DB-backed counts per role
- **Type**: `rule`
- **Given**: Populated society with 12 flats, 10 residents ACTIVE, 5 security, 7 requests today (3 pending, 2 checked in, 2 checked out).
- **When**: ADMIN calls societies/summary.
- **Then**: Response values = totals computed directly from DB (not hardcoded 7/10/5 etc.). Same for RESIDENT and SECURITY roles: values reflect real counts.
- **Evidence**: HTTP response values vs direct SQL counts match (±time-of-day drift for "today").

### AC-10 GlobalExceptionHandler produces all required error codes
- **Type**: `rule`
- **Given**: Various failure scenarios.
- **When**: Trigger each: invalid flat ID for resident (FLAT_NOT_FOUND); user not found during assignment (USER_NOT_FOUND); approve a request already APPROVED (INVALID_STATE_TRANSITION); assign user who is already resident (DUPLICATE_RESIDENT); create security staff with username already taken by another user → DUPLICATE_SECURITY_STAFF or USERNAME_ALREADY_TAKEN; weak password WEAK_PASSWORD.
- **Then**: Each response contains the exact error code specified.
- **Evidence**: Six HTTP response bodies with codes.

### AC-11 Society isolation on every resource
- **Type**: `rubric`
- **Dimension**: Coverage of cross-society guards
- **Scale**: 0-2
- **Anchors**: 0 = 3+ resources leak across societies; 1 = 1-2 leak; 2 = all resources guarded
- **Pass threshold**: >= 2
- **Evidence**: Tabular listing of each scoped endpoint + which line in which service performs ownership verification.

### AC-12 Database quality (V6 V7 migrations apply cleanly with indexes/constraints)
- **Type**: `rule`
- **Given**: Empty `societyone` DB.
- **When**: Boot backend with Flyway enabled.
- **Then**: V1..V7 all apply; `ddl-auto: validate` passes; psql `\d audit_logs` shows FKs and indexes; `\d notifications` same. No destructive changes to V1..V5.
- **Evidence**: Startup log with "Successfully applied 7 migrations" + psql describe outputs.

### AC-13 Backend compiles, tests pass, boots
- **Type**: `rule`
- **Given**: Clean checkout, Postgres running, environment configured.
- **When**: Run `mvnw.cmd clean test` then `mvnw.cmd spring-boot:run`.
- **Then**: mvn test BUILD SUCCESS; backend prints "Started SocietyoneBackendApplication" with port 8081.
- **Evidence**: Maven build log tail + startup log last 20 lines.

### AC-14 All 21 Phase 10 manual scenarios behave correctly end-to-end
- **Type**: `rubric`
- **Dimension**: End-to-end scenario pass rate
- **Scale**: 0-2
- **Anchors**: 0 = ≤14 scenarios pass; 1 = 15–20 pass; 2 = all 21 pass
- **Pass threshold**: >= 2
- **Evidence**: Per-scenario checklist with Result: PASS/FAIL + notes.

## Open Questions
- None. All ambiguity resolves by inspecting the frontend services/index.ts: Notification shape matches frontend Notification type; DashboardSummary matches exactly the `{label,value,helper,tone}` TS interface.
