# SocietyOne Backend Completion — Implementation Task Queue

> Derived from: `spec.md` (FR1–FR32, AC1–AC14)
> Execution order: strictly ascending `priority` then `id` (dependencies listed).
> Each task has AC mappings, Test Requirements (rule = pass/fail assert; rubric = scale-based), and a work envelope.

---

## Legend

| Status    | Meaning |
|-----------|---------|
| pending   | Not started |
| in_progress | Currently being implemented |
| blocked   | Waiting for another task or input |
| completed | Implemented and locally verified |
| cancelled | Superseded or out of scope |

| Priority | Meaning |
|----------|---------|
| P0       | Foundation — everything else depends on it |
| P1       | Core functionality required for 21-scenario pass |
| P2       | Completeness / robustness / polish |

---

## Task Queue

### —  Foundation  —

#### T001 — Global Exception Handler domain error codes
- **Priority:** P0
- **Status:** pending
- **AC mapped:** AC-10
- **Depends on:** (none)
- **Work envelope (single file mostly):**
  1. Edit `GlobalExceptionHandler.java` — extend `handleResponseStatusException` switch to map:
     - `USER_NOT_FOUND` → 404 + envelope code
     - `FLAT_NOT_FOUND` → 404
     - `RESIDENT_NOT_FOUND` → 404
     - `SECURITY_STAFF_NOT_FOUND` → 404
     - `VISITOR_NOT_FOUND` → 404
     - `REQUEST_NOT_FOUND` → 404
     - `INVALID_STATE_TRANSITION` → 400
     - `DUPLICATE_RESIDENT` → 409
     - `DUPLICATE_SECURITY_STAFF` → 409
     - `WEAK_PASSWORD` → 400
     - `FORBIDDEN` (already present — verify)
     - `BAD_REQUEST` fallback (already present — verify)
  2. Confirm `DataIntegrityViolation` handler maps profile `user_id` unique violations to `DUPLICATE_RESIDENT` / `DUPLICATE_SECURITY_STAFF` when message contains those table names; else default `CONFLICT`.
- **Test Requirements:**
  - [rule] T001.R1: `mvn clean compile` succeeds after edits.
  - [rule] T001.R2: A `ResponseStatusException(NOT_FOUND, "USER_NOT_FOUND")` returned from any controller produces envelope `code=USER_NOT_FOUND, status=404`.
  - [rule] T001.R3: A `ResponseStatusException(BAD_REQUEST, "INVALID_STATE_TRANSITION")` produces envelope `code=INVALID_STATE_TRANSITION`.
  - [rule] T001.R4: A `DataIntegrityViolationException` rooted in `uk_resident_profiles_user_id` maps to envelope `code=DUPLICATE_RESIDENT`.
  - [rule] T001.R5: A `DataIntegrityViolationException` rooted in security_staff `user_id` unique maps to envelope `code=DUPLICATE_SECURITY_STAFF`.
  - [rubric] T001.TR6: All 11 new domain codes + FORBIDDEN/BAD_REQUEST verified — 0 missing → score 2/2.

---

#### T002 — Flyway V6 + V7 + V8 migrations (audit + notifications + optional status check)
- **Priority:** P0
- **Status:** pending
- **AC mapped:** AC-7, AC-8, AC-12
- **Depends on:** (none, but must apply before Audit/Notification entities exist)
- **Work envelope:**
  1. Create `V6__create_audit_logs.sql` under `db/migration/`:
     - Columns: `id BIGSERIAL PK`, `actor_user_id BIGINT NOT NULL FK → users(id) ON DELETE RESTRICT`, `society_id BIGINT NULL FK → societies(id) ON DELETE SET NULL`, `action VARCHAR(50) NOT NULL`, `entity_type VARCHAR(60) NULL`, `entity_id BIGINT NULL`, `description TEXT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
     - Indexes: `idx_audit_logs_society_created (society_id, created_at DESC)`, `idx_audit_logs_actor (actor_user_id)`, `idx_audit_logs_action_created (action, created_at DESC)`.
     - CHECK `action <> ''`.
  2. Create `V7__create_notifications.sql`:
     - `id BIGSERIAL PK`, `recipient_user_id BIGINT NOT NULL FK → users(id) ON DELETE CASCADE`, `society_id BIGINT NULL FK → societies(id) ON DELETE SET NULL`, `type VARCHAR(30) NOT NULL`, `title VARCHAR(200) NOT NULL`, `message TEXT NOT NULL`, `read BOOLEAN NOT NULL DEFAULT FALSE`, `visit_request_id BIGINT NULL FK → visit_requests(id) ON DELETE SET NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
     - Indexes: `idx_notifs_recipient_read_created (recipient_user_id, read, created_at DESC)`, `idx_notifs_society (society_id)`.
     - CHECK `type IN ('REQUEST','APPROVAL','ENTRY','EXIT','SYSTEM')`.
  3. Create `V8__security_staff_status_enum_check.sql` (redundant-safe):
     - `ALTER TABLE security_staff_profiles DROP CONSTRAINT IF EXISTS chk_security_staff_status_2;`
     - `ALTER TABLE security_staff_profiles ADD CONSTRAINT chk_security_staff_status_enum CHECK (status IN ('ACTIVE','INACTIVE'));`
- **Test Requirements:**
  - [rule] T002.R1: `mvn clean compile` passes.
  - [rule] T002.R2: `mvn flyway:migrate` (or boot app) applies V6, V7, V8 cleanly on empty migrations history; `flyway_schema_history` contains 3 new rows with success=1.
  - [rubric] T002.TR3: Every FK has explicit ON DELETE behaviour, every NOT NULL is present, every enumerated column has a CHECK constraint → 2/2.

---

### —  Resident Management  —

#### T003 — Resident hardening: role guard, society ownership, role promotion, status toggles
- **Priority:** P1
- **Status:** pending
- **AC mapped:** AC-1, AC-11
- **Depends on:** T001
- **Work envelope:**
  1. `ResidentCreateRequest.java` — DELETE the `@NotNull Long userId` field (it's duplicated via controller `@RequestParam`; DTO now `{flatId, residentType}`).
  2. `ResidentProfileRepository.java` — add `List<ResidentProfile> findByFlat_SocietyIdOrderByCreatedAtDesc(Long societyId);` + `Long countByFlat_SocietyId(Long societyId);`.
  3. Rewrite `ResidentService.java` methods to accept `User actor` first arg:
     - `createResident(User actor, Long userId, ResidentCreateRequest req)`:
       * require `actor.getRole() == ADMIN` → else 403 FORBIDDEN.
       * resolve admin society via `societyRepo.findByOwnerOrderByNameAsc(actor).stream().findFirst()` → if none → 403 FORBIDDEN.
       * user exists → else USER_NOT_FOUND.
       * `residentRepo.existsByUserId(userId)` → true → 409 DUPLICATE_RESIDENT.
       * flat exists → else FLAT_NOT_FOUND.
       * flat.society.id == adminSociety.id → else FORBIDDEN.
       * `flat.getResidents()` (or residentRepo.findByFlatId) does not already have an OWNER if incoming type == OWNER (optional society rule: allow multiple OWNERs per flat? frontend ResidentType OWNER exists — default allow).
       * Save new ResidentProfile(user, flat, type, ACTIVE).
       * **Promote target User:** set `user.setRole(Role.RESIDENT)`, if `user.getAccountStatus() != LOCKED` → set `AccountStatus.ACTIVE`. Save user.
     - `listForAdminSociety(User actor)`: require ADMIN → resolve society → return repo `findByFlat_SocietyIdOrderByCreatedAtDesc(societyId)`.
     - `getResident(User actor, Long residentId)`: load resident → RESIDENT_NOT_FOUND if missing → ADMIN: verify resident.flat.society ∈ admin's society; RESIDENT role: verify resident.user.id == actor.id → else 403.
     - `updateStatus(User actor, Long residentId, ResidentStatus newStatus)`:
       * require ADMIN → 403 else.
       * resolve + ownership-check resident.
       * allowed transitions: ACTIVE↔INACTIVE only (other values rejected via enum — throw 400 INVALID_STATE_TRANSITION if LOCKED requested since it doesn't exist on ResidentStatus).
       * set `profile.setStatus(newStatus)`; ALSO set `profile.getUser().setAccountStatus(newStatus == ACTIVE ? ACTIVE : INACTIVE)`.
       * Save both.
     - Helper `getOwnProfile(User actor)` for RESIDENT role self-service.
  4. `ResidentController.java`:
     - Inject `AuthenticationPrincipal` or `Authentication` into every handler (use `CurrentUser.require(auth)` pattern).
     - `POST /api/residents?userId=` → call createResident(actor, userId, req).
     - Add new `GET /api/residents` → listForAdminSociety(actor).
     - `GET /{residentId}` → getResident(actor, id) with role guard.
     - `GET /flat/{flatId}` → require ADMIN + flat owned by admin's society; return `findByFlatId`.
     - `PATCH /{id}/status?status=` → updateStatus.
     - Wrap all calls in `ApiResponse.success(...)` envelope.
  5. `ResidentResponse.java` — OPTIONAL: convert Long IDs → String to match frontend domain.ts string-id contract (SafeUser returns String). Do this if frontend tests fail; otherwise leave Long (Spring JSON coerces).
- **Test Requirements:**
  - [rule] T003.R1: Compile passes.
  - [rule] T003.R2: ADMIN creates resident → returned profile + target User.role=RESIDENT + User.accountStatus=ACTIVE.
  - [rule] T003.R3: RESIDENT role user attempts POST /api/residents → returns envelope code=FORBIDDEN 403.
  - [rule] T003.R4: ADMIN assigns flat in another (fictional second) society → 403 FORBIDDEN.
  - [rule] T003.R5: Duplicate userId → 409 DUPLICATE_RESIDENT.
  - [rule] T003.R6: Missing user → 404 USER_NOT_FOUND; missing flat → FLAT_NOT_FOUND.
  - [rule] T003.R7: updateStatus(INACTIVE) → profile.status=INACTIVE AND User.accountStatus=INACTIVE. Re-activate → ACTIVE both.
  - [rule] T003.R8: Resident with accountStatus=INACTIVE cannot log in (JWT filter rejects non-ACTIVE — confirmed by T003.R7 flip; just verify filter logic unchanged).
  - [rubric] T003.TR9: AC-1 rule 6 items + AC-11 cross-society guard → 2/2 for both.

---

### —  Security Staff  —

#### T004 — Security Staff completion: enum status, status endpoint, password policy
- **Priority:** P1
- **Status:** pending
- **AC mapped:** AC-2, AC-11
- **Depends on:** T001, T002 (V8 optional; entity enum parallel)
- **Work envelope:**
  1. Create `SecurityStaffStatus { ACTIVE, INACTIVE }` enum under `com.societyone.app.security.entity`.
  2. Edit `SecurityStaffProfile.java`: replace `private String status = "ACTIVE";` with `@Enumerated(EnumType.STRING) private SecurityStaffStatus status = SecurityStaffStatus.ACTIVE;`.
  3. `SecurityStaffService.java`:
     - In `create(User admin, SecurityStaffCreateRequest req)` BEFORE `passwordEncoder.encode()`: add inline policy check mirroring `AuthService.passwordMeetsPolicy`. Fail → 400 WEAK_PASSWORD.
     - Uniqueness failure currently throws ResponseStatusException — verify reason strings match new codes USERNAME_ALREADY_TAKEN / EMAIL_ALREADY_REGISTERED / MOBILE_ALREADY_REGISTERED (already exist in GEH).
     - Add `updateStatus(User admin, Long staffId, SecurityStaffStatus newStatus)`:
       * require admin role → 403.
       * load profile by id → SECURITY_STAFF_NOT_FOUND.
       * profile.society == admin's society → else 403.
       * Flip profile.status + underlying `User.accountStatus = ACTIVE/INACTIVE` exactly like resident (no LOCKED mapping).
       * Save both.
     - Ensure `getAll(User admin)` returns only admin-society staff; `getById(User admin, Long id)` ownership-checks.
  4. `SecurityStaffController.java`: add `PATCH /api/security-staff/{id}/status` endpoint with `@RequestParam SecurityStaffStatus status`.
  5. `SecurityStaffResponse.java`: optionally String ids. Ensure `status` serializes to string enum name.
- **Test Requirements:**
  - [rule] T004.R1: Compile passes; `ddl-auto: validate` succeeds (column stays VARCHAR).
  - [rule] T004.R2: Admin creates security staff with weak password → 400 WEAK_PASSWORD envelope code.
  - [rule] T004.R3: Valid create → User.role=SECURITY, accountStatus=ACTIVE, profile.status=ACTIVE.
  - [rule] T004.R4: PATCH /status → flips profile + user accountStatus; INACTIVE user cannot pass JWT filter.
  - [rule] T004.R5: SECURITY role user tries to create another → 403.
  - [rule] T004.R6: Duplicate email/mobile/username → correct 409 code.
  - [rubric] T004.TR7: AC-2 rules 6 items + AC-11 isolation → 2/2.

---

### —  Visitor Management  —

#### T005 — Visitor harden: fix security actor bug, PENDING_SECURITY intermediate, list dispatch, visitor GETs, cancel
- **Priority:** P1
- **Status:** pending
- **AC mapped:** AC-3, AC-4, AC-5, AC-6, AC-11
- **Depends on:** T001, T003 (resident lookup helpers), T004 (security profile lookup)
- **Work envelope:**
  1. `VisitorRepository.java` — add `List<Visitor> findBySocietyIdOrderByCreatedAtDesc(Long societyId);` (if society FK exists — inspect entity. If Visitor has denormalized societyId, great; else add Optional `findByMobileNumber` etc. or list all with pagination 50).
  2. `VisitRequestRepository.java` — add (if missing) `List<VisitRequest> findByResidentIdOrderByCreatedAtDesc(Long residentUserId);` + `List<VisitRequest> findBySocietyIdAndRequestStatusInOrderByCreatedAtDesc(Long societyId, Collection<VisitRequestStatus> statuses);` (reuse existing methods where possible).
  3. **Fix validateActorAccess SECURITY branch bug** (Resident branch is `actor == residentUser`; Security branch wrongly same comparison):
     - For SECURITY role caller: resolve SecurityStaffProfile by actor.getId() → profile.society.id must equal society.getId() → else 403.
     - Add **VISITOR role branch** (forbid arbitrary residents): if role == VISITOR then require source==VISITOR AND `visitor.getMobileNumber().equalsIgnoreCase(actor.getMobileNumber())` (visitor can only self-invite with matching mobile) → else 403.
  4. **Fix PENDING_SECURITY step**:
     - `approveByResident()`: keep resident ownership checks. At end set `request.setRequestStatus(PENDING_SECURITY)` **instead of** `APPROVED_BY_RESIDENT` (or keep APPROVED audit entry then overwrite to PENDING_SECURITY — single write OK).
     - `acceptBySecurity()`: change guard `if (request.getRequestStatus() != VisitRequestStatus.PENDING_SECURITY)` → reject with INVALID_STATE_TRANSITION.
     - After accept → set `ACCEPTED_BY_SECURITY` + `visitStatus = WAITING_AT_GATE`.
  5. Add strict `isValidTransition(request, targetState)` helper:
     Map every valid step exactly per spec workflow matrix. Reject anything else with INVALID_STATE_TRANSITION.
  6. Add visitor list/detail + cancellation methods in `VisitorService`:
     - `listVisitors(User actor)` — ADMIN → by society; SECURITY → by staff society; RESIDENT → by flat's society; VISITOR → forbidden.
     - `getVisitor(User actor, Long visitorId)` — load + cross-society guard.
     - `cancelRequest(User actor, Long reqId)` — RESIDENT owner only; allowed states PENDING_RESIDENT/PENDING_SECURITY/APPROVED_BY_RESIDENT. Target: REQUEST_STATUS stays (add a CANCELLED if enum has it; else fall back to `REJECTED_BY_RESIDENT` with description=cancelled — prefer adding CANCELLED value to enum ONLY if migration-safe. Since V5 already defines enum CHECK, we reuse REJECTED for cancelled requests and store description).
  7. **Role-dispatched list requests**:
     - Add service `listRequestsFor(User actor)`: ADMIN→listForAdmin; RESIDENT→listByResidentUserId(actor.id); SECURITY→listBySociety(staff.society); VISITOR→listByVisitorMobile(actor.mobile).
     - Update `VisitorController.listRequests()` to call `listRequestsFor(actor)`.
  8. Add controller endpoints:
     - `GET /api/visitors` → listVisitors(actor).
     - `GET /api/visitors/{id}` → getVisitor(actor, id).
     - `PATCH /api/visitors/requests/{id}/cancel` → cancelRequest(actor, id).
  9. String-enforce standardised reason `"INVALID_STATE_TRANSITION"` in all reject branches so GEH maps correctly.
- **Test Requirements:**
  - [rule] T005.R1: Compile passes.
  - [rule] T005.R2: Security staff creates visit request (source SECURITY) in own society → succeeds; another society's security → 403. (AC-4)
  - [rule] T005.R3: Happy path (V→P_RES→APPROVE→P_SEC→ACCEPT→CHECKIN→CHECKOUT): each step succeeds; wrong step at any point → 400 INVALID_STATE_TRANSITION.
  - [rule] T005.R4: Resident approval skipped, direct security accept on PENDING_RESIDENT → INVALID_STATE_TRANSITION.
  - [rule] T005.R5: Check-in on PENDING_SECURITY → INVALID_STATE_TRANSITION (must be ACCEPTED).
  - [rule] T005.R6: Check-out before check-in → INVALID_STATE_TRANSITION.
  - [rule] T005.R7: RESIDENT lists requests → only theirs; SECURITY lists → only theirs; ADMIN lists → whole society. (AC-5)
  - [rule] T005.R8: GET /visitors + GET /visitors/{id} work per role; cross-society access → 403 / 404 masked. (AC-6)
  - [rule] T005.R9: VISITOR role tries to create request for arbitrary resident → 403 (only self-mobile match allowed).
  - [rubric] T005.TR10: AC-3 state transitions + AC-4 security cross-society + AC-5 list + AC-6 visitor GET + AC-11 isolation → 2/2 each.

---

### —  Audit System  —

#### T006 — Build Audit module (entity/repo/DTO/service/controller) and wire record() calls
- **Priority:** P1
- **Status:** pending
- **AC mapped:** AC-7, AC-11
- **Depends on:** T002 (V6 migration)
- **Work envelope:**
  1. Create new package `com.societyone.app.audit`.
  2. `entity/AuditAction.java` — enum containing exactly the documented actions:
     `AUTH_LOGIN, AUTH_LOGOUT, SOCIETY_CREATED, SOCIETY_UPDATED, BUILDING_CREATED, BUILDING_UPDATED, FLOOR_CREATED, FLOOR_UPDATED, FLAT_CREATED, FLAT_UPDATED, RESIDENT_CREATED, RESIDENT_STATUS_CHANGED, SECURITY_STAFF_CREATED, SECURITY_STAFF_STATUS_CHANGED, VISITOR_CREATED, VISIT_REQUEST_CREATED, VISIT_APPROVED, VISIT_REJECTED, SECURITY_ACCEPTED, SECURITY_REJECTED, VISITOR_CHECKED_IN, VISITOR_CHECKED_OUT`.
  3. `entity/AuditLog.java`:
     - `@Table(name = "audit_logs")`
     - Fields: Long id, Long actorUserId, Long societyId, @Enumerated AuditAction action, String entityType, Long entityId, String description, Instant createdAt.
     - NO JPA relationships (actor/society are bare IDs to avoid eager joins and circular cascades). FK integrity lives in DB only.
  4. `repository/AuditLogRepository.java`:
     - `JpaRepository<AuditLog, Long>` + `Page<AuditLog> findBySocietyIdOrderByCreatedAtDesc(Long societyId, Pageable pageable);` + `Optional<AuditLog> findByIdAndSocietyId(Long id, Long societyId);`.
  5. `dto/AuditLogResponse.java`:
     - Matches frontend `AuditEvent { id, action, actor, target, timestamp, detail }`.
     - Include actorName (lookup by actorUserId), action as string, detail=description, entityType+entityId rendered as target string.
  6. `service/AuditService.java` (constructor-inject UserRepository + AuditLogRepository):
     - `@Transactional(propagation = REQUIRES_NEW)` — records in independent tx so core workflow never rolls back because of audit failure.
     - `record(AuditAction action, User actor, Long societyId, String entityType, Long entityId, String description)` — builds + saves entity. Swallow any RuntimeException (log.error) so caller never fails because of audit.
     - Helper overloads for convenience.
  7. `controller/AuditController.java`:
     - `GET /api/audit` → require ADMIN/SECURITY? Documented admin-only → require ADMIN. Resolve admin society → `findBySocietyIdOrderByCreatedAtDesc(PageRequest.of(0,100))` → map DTOs.
     - `GET /api/audit/{id}` → load by id+society → 404 if cross-society.
     - `@PreAuthorize("hasRole('ADMIN')")` on both endpoints.
  8. **WIRE record() calls into every existing+new create/update service method** (list exactly — use `@Autowired AuditService auditService` constructor-inject):
     - `AuthService.login()` → AUTH_LOGIN (pass societyId=null for non-society users; for RESIDENT/SECURITY/ADMIN look up society via profile and pass).
     - `AuthService.logout()` → AUTH_LOGOUT (if logout has server-side trace; if not, skip per `if applicable`).
     - `SocietyStructureService.createSociety/updateSociety/createBuilding/updateBuilding/createFloor/updateFloor/createFlat/updateFlat` → corresponding SOCIETY/BUILDING/FLOOR/FLAT actions.
     - `ResidentService.create/updateStatus` → RESIDENT_CREATED / RESIDENT_STATUS_CHANGED.
     - `SecurityStaffService.create/updateStatus` → SECURITY_STAFF_CREATED / SECURITY_STAFF_STATUS_CHANGED.
     - `VisitorService.createVisitor/createRequest/approveByResident/rejectByResident/acceptBySecurity/rejectBySecurity/checkIn/checkOut` → corresponding VISITOR/VISIT_REQUEST/APPROVED/REJECTED/SEC_ACCEPTED/SEC_REJECTED/CHECKED_IN/CHECKED_OUT.
  9. IMPORTANT: No duplicate calls (e.g. approveByResident sets two states but emits single VISIT_APPROVED).
- **Test Requirements:**
  - [rule] T006.R1: Compile passes; ddl-auto validate passes.
  - [rule] T006.R2: After 1 full happy-path scenario run (login, create resident, create security, create visitor+request, approve, accept, check-in, check-out), `SELECT count(*) FROM audit_logs` ≥ 12 rows, each with non-null action and actor_user_id.
  - [rule] T006.R3: Admin B cannot GET /api/audit/{id} for audit row whose society belongs to Admin A (returns 404 not 200).
  - [rule] T006.R4: RESIDENT / SECURITY role hit GET /api/audit → Spring Security 403 (controller has @PreAuthorize ADMIN).
  - [rubric] T006.TR5: AC-7 rows + cross-admin + enum coverage 22 actions all wired → 2/2.

---

### —  Notification System  —

#### T007 — Build Notification module and auto-create on workflow
- **Priority:** P1
- **Status:** pending
- **AC mapped:** AC-8, AC-11
- **Depends on:** T002 (V7 migration), T005 (workflow hooks to wire)
- **Work envelope:**
  1. Create new package `com.societyone.app.notification`.
  2. `entity/NotificationType.java`: enum `REQUEST, APPROVAL, ENTRY, EXIT, SYSTEM` (matches CHECK constraint).
  3. `entity/Notification.java`:
     - `@Table(name = "notifications")`
     - Fields: Long id, Long recipientUserId, Long societyId, @Enumerated NotificationType type, String title, String message, boolean read, Long visitRequestId, Instant createdAt.
     - Again NO @ManyToOne to User/Society/VisitRequest to avoid join complexity; FK in DB.
  4. `repository/NotificationRepository.java`:
     - `List<Notification> findByRecipientUserIdOrderByCreatedAtDesc(Long userId);`
     - `Optional<Notification> findByIdAndRecipientUserId(Long id, Long userId);`
     - `int countByRecipientUserIdAndReadFalse(Long userId);` (unread helper).
  5. `dto/NotificationResponse.java`:
     - Matches frontend Notification: id, title, description (maps to message), type (string enum), timestamp, read, requestId (visitRequestId).
     - String ids.
  6. `service/NotificationService.java`:
     - `create(User recipient, Long societyId, NotificationType type, String title, String message, Long visitRequestId)` → saves.
     - Convenience overloads.
     - `listForUser(User user)` → all by recipientUserId; no cross-user (callers pass current user only).
     - `markRead(User user, Long id)` → findById+recipient; set read=true; save.
     - `markAllRead(User user)` → load all unread, set read=true, save all.
  7. `controller/NotificationController.java`:
     - `GET /api/notifications` → `CurrentUser.require(auth)` → listForUser(actor) → ApiResponse envelope.
     - `PATCH /api/notifications/{id}/read` → markRead(actor, id) → 404 if wrong user (envelope NOT_FOUND).
     - `PATCH /api/notifications/read-all` → markAllRead(actor).
     - No role guards on controller; user-only access enforced inside service via recipientUserId=actor.getId().
  8. **WIRE auto-creation in VisitorService workflow hooks** (constructor-inject NotificationService; plus SecurityStaffProfileRepository / ResidentProfileRepository to resolve recipients):
     - On VISIT_REQUEST_CREATED (source VISITOR or SECURITY creates): notify the RESIDENT user → type=REQUEST, title="New visitor approval request", message="%s wants to visit…", visitRequestId=id.
     - On VISIT_REJECTED_BY_RESIDENT → notify CREATOR (if VISITOR role → visitor; if SECURITY → that security user). Type=SYSTEM, title="Visit request rejected".
     - On VISIT_APPROVED_BY_RESIDENT → notify ALL ACTIVE security staff of that society (use `securityStaffRepo.findBySocietyId(societyId).stream().filter(ACTIVE)`). Broadcast: type=APPROVAL, title="Approved visitor awaiting gate".
     - On SECURITY_ACCEPTED → notify RESIDENT: type=APPROVAL, title="Security accepted visitor".
     - On CHECK-IN → notify RESIDENT: type=ENTRY, title="Visitor checked in".
     - On CHECK-OUT → notify RESIDENT: type=EXIT, title="Visitor checked out".
- **Test Requirements:**
  - [rule] T007.R1: Compile; ddl-auto validate.
  - [rule] T007.R2: Happy path scenario → DB rows count ≥ 6 (REQUEST, APPROVAL broadcast, SEC_ACCEPT notify, ENTRY, EXIT, 1 more e.g. security accept).
  - [rule] T007.R3: Resident A calls GET /api/notifications → only their own; Resident B cannot access notification with id belonging to A (returns 404 masked).
  - [rule] T007.R4: PATCH /read and /read-all flip read=true; count unread drops.
  - [rubric] T007.TR5: AC-8 5 workflow events + cross-user guard + correct types (REQUEST/APPROVAL/ENTRY/EXIT/SYSTEM) all observed → 2/2.

---

### —  Dashboard / Summary  —

#### T008 — Real dashboard summary endpoint + SecurityConfig URL fix
- **Priority:** P2
- **Status:** pending
- **AC mapped:** AC-9
- **Depends on:** T003, T004, T005 (count queries need repositories with new count methods added earlier)
- **Work envelope:**
  1. **SecurityConfig URL fix FIRST** — add BEFORE the broader `/api/societies/**` hasRole('ADMIN') matcher:
     - `requestMatchers(HttpMethod.GET, "/api/societies/summary").authenticated()`
     OR move endpoint to own path `/api/dashboard/summary` to avoid ordering trap. Pick one and document.
     Cleanest: move to `/api/dashboard/summary` + frontend needs one-line fix later (not in this task scope; we'll expose BOTH paths if needed — single controller).
  2. Create `DashboardSummaryResponse` DTO under `common/dto/` or a new `com.societyone.app.dashboard.dto`:
     - Record `DashboardSummaryResponse(String label, Long value, String helper, String tone)` matching frontend 4-tile shape (tone ∈ {"blue","orange","green","slate"}).
  3. Add count helper methods to repositories (if missing):
     - FlatRepository: `Long countBySocietyId(Long societyId);`
     - VisitorRequestRepository: `Long countBySocietyIdAndExpectedDate(Long societyId, LocalDate date);`
     - VisitorRequestRepository: `Long countBySocietyIdAndRequestStatus(Long societyId, VisitRequestStatus status);`
     - VisitorRequestRepository: `Long countBySocietyIdAndVisitStatus(Long societyId, VisitStatus status);`
  4. Create `DashboardService.java` + `DashboardController.java` OR add to existing `SocietyController.java` since path is `/societies/summary`:
     - `GET /api/societies/summary` + `GET /api/dashboard/summary` (both route to same handler to ease frontend transition).
     - Logic per role:
       * **ADMIN:** tiles = [
         Residents(blue): count resident profiles in admin's society.
         Flats(green): count flats.
         Security Staff(slate): count security profiles ACTIVE.
         Pending Requests(orange): count PENDING_RESIDENT + PENDING_SECURITY for today/overall.
         Visitors Today(blue — if 5th tile needed, else pick 4 per frontend).
         ].
       * **SECURITY:** tiles = [
         Checked-in(blue) today,
         Pending at gate(orange): ACCEPTED_BY_SECURITY + WAITING_AT_GATE,
         Checked-out(green) today,
         Approved requests(slate) count.
         ].
       * **RESIDENT:** tiles = [
         My pending requests(orange),
         Approved(slate),
         Checked-in today(blue),
         Checked-out(green).
         ].
       * **VISITOR:** tiles = [
         My requests(slate),
         Approved(blue),
         Pending(orange),
         Rejected(green muted).
         ].
     - Map counts to tone/label/value/helper exactly as frontend currently renders (inspect current hardcoded labels and mirror).
  5. Return `ApiResponse.success(List<DashboardSummaryResponse>)`.
- **Test Requirements:**
  - [rule] T008.R1: Compile; boot app.
  - [rule] T008.R2: ADMIN GET /api/societies/summary → 200, list of 4+ DashboardSummary items with non-null value.
  - [rule] T008.R3: RESIDENT GET /api/societies/summary → 200 (no 403 from SecurityConfig — validates URL fix in step 1).
  - [rubric] T008.TR4: Each tile's value for ADMIN equals direct `SELECT count(...)` SQL run against same DB for each tile filter → 2/2 exact matches.

---

### —  Validation & Isolation Pass  —

#### T009 — End-to-end validation pass: @Valid, ApiResponse envelope, cross-society isolation on every endpoint
- **Priority:** P2
- **Status:** pending
- **AC mapped:** AC-10, AC-11
- **Depends on:** T003, T004, T005, T006, T007, T008 (all endpoint surfaces present)
- **Work envelope:**
  1. Add `@Valid` on every `@RequestBody` controller parameter (check old+new controllers — existing ones likely already have).
  2. Ensure every controller method returns `ApiResponse<T>` envelope at top level (no bare lists, no bare DTOs, no bare `void` for mutations that currently return nothing — return 200 with success envelope `ApiResponse.success(null, "Message")`).
  3. **Systematic cross-society ownership verification:** for every existing service method that currently resolves an ID-scoped entity, add an assertion comparing society ownership against actor role — produce a written checklist (in-file comments or this task note) of each:
     - SocietyStructureService: already has requireOwnedSociety/Building/Floor/Flat — verify no new code paths bypass.
     - ResidentService: verified in T003 — confirm GET flat list scoped.
     - SecurityStaffService: verified in T004 — confirm no leaks.
     - VisitorService: verify every GET endpoint resolves society via entity → guards added in T005.
     - AuditController: findById+societyId guard in T006.
     - NotificationController: recipientUserId guard in T007.
     - Dashboard endpoint: all counts scoped per actor role in T008.
  4. Ensure NO endpoint ever returns passwordHash or raw User entity — all use SafeUserResponse or hand-crafted safe DTOs. Search codebase for any `.getPasswordHash()` outside of AuthService+JWT filter; eliminate if found.
  5. Confirm GlobalExceptionHandler never prints stack trace in response (it logs only).
- **Test Requirements:**
  - [rule] T009.R1: A POST with invalid body (missing required field) → 400 + VALIDATION_ERROR envelope with field error details.
  - [rule] T009.R2: Every 2xx/4xx response from every endpoint is a JSON object with `success` boolean key at root (envelope), never a bare array/object.
  - [rubric] T009.TR3: AC-11 isolation rubric 0–2 score 2/2 on manual penetration of Admin A → Society B on every resource category (society/building/floor/flat/resident/security/visitor/audit/notification) → 2/2.
  - [rubric] T009.TR4: Response body grep for `"passwordHash":` over full 21 scenario logs → 0 occurrences → 2/2.

---

### —  Build & Verification  —

#### T010 — mvn clean test, boot, execute 21 scenario checklist
- **Priority:** P0 (gate)
- **Status:** pending
- **AC mapped:** AC-13, AC-14
- **Depends on:** T001–T009 all completed
- **Work envelope:**
  1. `mvn clean test -q` → fix compile errors, fix failing tests.
  2. `mvn spring-boot:run` → capture startup log; verify banner shows Started on port 8081; Flyway applied all migrations including V6,V7,V8; ddl-auto validate passes (no SchemaManagementException).
  3. Execute 21 scenario end-to-end checklist against running backend (via curl/HTTPie/Postman — use curl for scriptability). Store results as JSON logs or terminal captures. Scenarios:
     1. Admin login
     2. Resident login
     3. Security login
     4. Society access (admin get society)
     5. Resident assignment (admin create resident)
     6. Security staff creation
     7. Visitor creation
     8. Visit request creation
     9. Resident approval
     10. Security acceptance
     11. Check-in
     12. Check-out
     13. Resident rejection
     14. Security rejection
     15. Invalid state transitions
     16. Cross-society access denial (admin B attempts admin A data)
     17. Audit creation + row count
     18. Audit listing + filtering
     19. Notification creation
     20. Notification read + read-all
     21. Password hashes BCrypt (SELECT password_hash LIKE '$2a$%' or `BCryptPasswordEncoder.matches()`)
  4. Fix any failures found (likely backtracks to earlier tasks); re-run until all pass.
- **Test Requirements:**
  - [rule] T010.R1: `mvn clean test` → BUILD SUCCESS.
  - [rule] T010.R2: `mvn spring-boot:run` → `Started SocietyOneApplication in X seconds`; exit code 0 after manual stop.
  - [rubric] T010.TR3: Scenario 1–21 pass count: 21/21 → 2/2; 20/21 → 1/2; ≤19 → 0/2 (AC-14 rubric).

---

#### T011 — Final code quality pass + documentation of Files Created/Modified (for deliverable)
- **Priority:** P2
- **Status:** pending
- **AC mapped:** (process — produces final report)
- **Depends on:** T010
- **Work envelope:**
  1. Remove any unused imports; ensure all services use constructor injection, no field `@Autowired` (with 1 parameter `@Autowired` is optional — Lombok if present, else explicit constructor).
  2. Ensure no service uses bean-injected CurrentUser (all use static `CurrentUser.require(auth)` pattern).
  3. Ensure User.setPassword only uses `setPasswordHash(encoder.encode(raw))` — no invented setPassword.
  4. Ensure Flat references use `getNumber()` — no `getFlatNumber()`.
  5. Ensure society lookup uses `findByOwnerOrderByNameAsc(owner).stream().findFirst()` — no findByOwnerId.
  6. Collate final inventory (used for final assistant response):
     - Files created list.
     - Files modified list.
     - Flyway added (V6,V7,V8).
     - New API endpoints table (method + path + roles + brief).
     - Existing APIs changed list (old behaviour vs new).
     - Tests performed log.
     - Remaining backend limitations (e.g. OTP still in-memory, no rate-limiting, no password rotation policy, no soft-delete on users, no email/SMS gateway, pagination in audit list page 0 hardcoded 100 limit, hardcoded CORS origin single).
- **Test Requirements:**
  - [rule] T011.R1: No field injection grepped (search `@Autowired` on fields — exception: constructor parameter injection OK).
  - [rule] T011.R2: 0 references to `findByOwnerId` in codebase; 0 references to `getFlatNumber()`; 0 references to `user.setPassword(` (only `setPasswordHash`).
  - [rule] T011.R3: All services/controllers ≥ 90% constructor-injected fields; residual field injection if any is zero.
  - [rubric] T011.TR4: Final inventory covers all 7 sections as requested by user final requirement → 2/2 completeness.

---

## Dependency Graph (topological order)

```
T001  T002
 │     │
 │     └────────────────┐
 T003  T004  T005       │
 │     │     │          │
 └──┬──┘     │          │
    │        │          │
   T006──────┘          │
    │                   │
   T007◄────────────────┘
    │
   T008
    │
   T009
    │
   T010
    │
   T011
```

Vertical slice integrity: Each task is a deployable vertical slice — after T001+T002 backend still boots; after T003 resident module works; after T005 full visitor hardened; after T006+T007 audit+notification auto-wired; after T008 dashboard real; after T009 clean envelope; after T010 build+21 scenarios green; after T011 inventory report ready.

---

## Rollback Hooks (per task if it breaks prior behaviour)

- T001: pure extension of GEH cases; no existing case is removed. If regression, restore original switch only.
- T002: additive-only migrations; rollback = delete new migration files and run `mvn flyway:clean` then `migrate` on a throwaway DB only (never clean prod).
- T003: rollback = restore original ResidentService, ResidentController, ResidentCreateRequest; new repository methods are additive and harmless.
- T004: if enum change causes JPA validation issues, revert to String field + @Pattern; remove status endpoint.
- T005: keep original file backups in git (or revert entire service).
- T006–T008: new packages/controllers; rollback = delete new packages + revert wire-in call sites.
- T009: pure review; rollback = remove any @Valid additions that break contracts.
- T010: no code; findings produce patches that apply to earlier tasks.
- T011: documentation.
