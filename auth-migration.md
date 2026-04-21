# Auth Migration Plan (Profiles Password -> Supabase Auth)

## Goal

Migrate all user login (creator, admin, marketing) to Supabase Authentication as the single auth source, while keeping `profiles` as business/profile data only.

## Current State

- Creator login uses custom password in `profiles.password_hash`.
- Admin/marketing login now uses Supabase Auth + profile flags (`is_admin`, `is_mkt`).
- Route authorization is mixed between cookie session checks and profile flag checks.

## Target State

- All roles authenticate via Supabase Auth (`auth.users`).
- `profiles.id` is aligned with `auth.users.id` (1:1 mapping).
- Authorization (admin/marketing/creator) is derived from `profiles` flags + role policy.
- `profiles.password_hash` is deprecated and then removed from runtime usage.

## Migration Strategy

Use phased rollout with fallback and observability. Do not do a big-bang cutover.

---

## Phase 0: Preparation

1. **Schema readiness**
   - Ensure `profiles.id` is UUID and can map to `auth.users.id`.
   - Keep/introduce indexes on:
     - `profiles.id`
     - `profiles.email` (case-insensitive strategy if needed)
   - Confirm flags exist and are populated:
     - `is_admin`
     - `is_mkt`

2. **Environment / operational readiness**
   - Confirm Supabase Auth email templates and sender config are correct.
   - Confirm recovery/reset links point to correct domains and base paths.

3. **Backup and rollback**
   - Snapshot `profiles` table before migration.
   - Keep existing creator custom login path behind a feature flag.

---

## Phase 1: Data Mapping and Backfill

1. **Create/verify auth users**
   - For each active creator in `profiles`, create or verify corresponding `auth.users` account.
   - Use normalized email matching (lowercase + trim).

2. **Align IDs**
   - Preferred model: `profiles.id = auth.users.id`.
   - If existing IDs differ, add temporary mapping process and migrate safely in batches.

3. **Flag hygiene**
   - Validate admin/marketing users have correct profile flags.
   - Remove ambiguous combinations if policy disallows them.

4. **Audit report**
   - Generate list:
     - users in profiles without auth user
     - auth users without profiles row
     - duplicates/conflicts by email

---

## Phase 2: Dual-Path Login (Safe Cutover)

1. **Creator login path**
   - Attempt Supabase Auth login first.
   - If not migrated yet (controlled fallback window), use legacy `profiles.password_hash` login.

2. **Admin/marketing path**
   - Keep Supabase Auth only.
   - Resolve role by profile flags after auth success.

3. **Session standardization**
   - Keep one app session format (`asw_session`) but source identity from Supabase-authenticated user.

4. **Telemetry**
   - Log outcomes:
     - `auth_supabase_success`
     - `auth_legacy_fallback_used`
     - `auth_forbidden_by_flags`
     - `auth_profile_missing`

---

## Phase 3: Route and API Authorization Hardening

1. **Route guards**
   - `/admin/*`: require `is_admin = true`.
   - `/creators`: require (`is_admin = true` AND `is_mkt = true`) per current policy.
   - Creator routes: require authenticated creator identity and approval policy.

2. **API guards**
   - Apply same role policy in APIs (not only pages/middleware).
   - Prevent bypass via direct API calls.

3. **Consistency check**
   - Ensure middleware, server components, and API handlers use consistent role source and checks.

---

## Phase 4: Remove Legacy Auth

1. **Disable fallback**
   - Turn off legacy creator fallback after migration completion threshold is met.

2. **Code cleanup**
   - Remove runtime usage of:
     - `profiles.password_hash` verification flow
     - legacy auth helper branches

3. **DB deprecation**
   - Mark `password_hash` as deprecated first.
   - Drop column in a later release after monitoring confirms stability.

---

## Testing Plan

1. **Unit/integration**
   - Supabase login success/failure.
   - Role mapping from profile flags.
   - Forbidden scenarios (missing flags/profile).

2. **E2E scenarios**
   - Creator login, profile access, approved/rejected behavior.
   - Admin login and dashboard access.
   - Marketing login and `/creators` access.
   - Password recovery flow (all intended roles).

3. **Regression checks**
   - Existing creator registration and approval workflows.
   - Session persistence and logout behavior.

---

## Rollout Plan

1. Deploy with dual-path + telemetry.
2. Migrate users in controlled batches.
3. Monitor auth failure/error rates daily.
4. Announce cutover date for legacy password removal.
5. Disable fallback and cleanup.

---

## Rollback Plan

If major auth regression occurs:

1. Re-enable legacy creator fallback immediately (feature flag).
2. Keep admin/marketing on Supabase Auth unchanged.
3. Restore previous route guard behavior temporarily.
4. Use migration audit logs to fix affected accounts, then retry rollout.

---

## Ownership Checklist

- Product: approve role policy and migration timeline.
- Engineering: implement phases and telemetry.
- QA: run full role-based UAT matrix.
- Operations: handle user communication and support runbook for password reset.

