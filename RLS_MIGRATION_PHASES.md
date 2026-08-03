# Profiles RLS Migration Plan (Phased)

This document defines a safe, phased migration plan to enable Row Level Security (RLS) for `public.profiles` without breaking the Creator Club app.

---

## Goal

- Protect `profiles` data from unrestricted client access.
- Remove broad policies like "enable read/update/delete for all".
- Gradually move critical `profiles` operations from client-side Supabase calls to server-side API routes.
- Enable strict RLS at the end with minimal production risk.

---

## Current Risk Summary

- `profiles` currently has RLS disabled (or effectively unrestricted).
- App uses custom session cookie (`asw_session`) and many browser-side calls to `supabase.from('profiles')`.
- Enabling strict RLS immediately will break login/register/profile flows.

---

## Phase 0 - Preparation (No Behavior Change)

1. **Create branch + backup**
   - Create a migration branch.
   - Export current policy definitions and table schema.
   - Snapshot production DB before policy changes.

2. **Inventory all `profiles` access**
   - List every read/write path in codebase that touches `profiles`.
   - Label each as:
     - Browser direct query
     - API route/server query
     - Admin-only flow

3. **Define required operations matrix**
   - For each feature (register, login, profile edit, admin dashboard), map required DB actions:
     - `SELECT`, `INSERT`, `UPDATE`, `DELETE`
     - Who should be allowed (anon/authenticated/admin/server only)

4. **Add observability**
   - Ensure failing API routes log clear permission errors.
   - Add temporary logging around profile read/write failures in app.

Deliverable: operation matrix + list of code paths touching `profiles`.

---

## Phase 1 - Immediate Risk Reduction (Safe Guardrails)

1. **Create migration: enable RLS**
   - `alter table public.profiles enable row level security;`

2. **Drop broad/open policies**
   - Remove policies equivalent to:
     - read for all
     - insert for all
     - update for all
     - delete for all

3. **Temporary compatibility policy (minimal)**
   - If needed to keep app alive temporarily, add only the minimum read policy required.
   - Avoid enabling open write policies.

4. **Smoke test**
   - Test critical user journeys in staging:
     - Landing
     - Register
     - Login
     - Creator profile load
     - Admin list view

Deliverable: RLS is ON, unrestricted policies removed, app still usable in staging.

---

## Phase 2 - Move Writes to Server (High Priority)

1. **Server route for register**
   - Ensure creator register insert/upsert goes through API route only.
   - Client should not insert into `profiles` directly.

2. **Server route for profile update**
   - Move profile update flow to API route (`PATCH /api/profile/...`).
   - Validate ownership using session cookie.

3. **Server route for password updates**
   - Move password hash updates to server route.
   - Block direct client update to `profiles.password_hash`.

4. **Server route for admin mutations**
   - Approval/rejection/status changes must be server-only.

5. **Remove direct client write calls**
   - Replace browser `supabase.from('profiles').update/insert/delete` usages.

Deliverable: all `profiles` writes are server-mediated.

---

## Phase 3 - Move Sensitive Reads to Server

1. **Identify sensitive columns**
   - `password_hash`, internal flags, admin-only fields, private contact data.

2. **Create read APIs for client**
   - Add API routes returning only required fields.
   - Apply response shaping/sanitization.

3. **Reduce direct browser `SELECT *` patterns**
   - Replace with narrow server responses.

Deliverable: browser gets only minimal profile fields needed per screen.

---

## Phase 4 - Tighten Policies (Target State)

1. **Keep RLS enabled permanently**

2. **Define strict policies**
   - `anon`: no direct access to `profiles` (or very limited read if absolutely required).
   - `authenticated`: only own profile rows (if still allowing direct client reads).
   - Admin actions: via server role/API only.

3. **Explicitly deny broad writes**
   - No insert/update/delete policies for general client roles unless required and ownership-guarded.

4. **Optional hardening**
   - Consider `alter table public.profiles force row level security;`
   - Use only trusted server/service-role paths for admin operations.

Deliverable: least-privilege RLS policy model for `profiles`.

---

## Phase 5 - Validation + Rollout

1. **Integration test checklist**
   - Register (normal + invite)
   - Login (email/password + Facebook flow if used)
   - Profile view/edit/save
   - Password setup/recovery
   - Admin dashboard profile workflows

2. **Staging soak**
   - Run for at least 1-2 business days with real-like data volume.

3. **Production rollout**
   - Deploy off-peak window.
   - Monitor error rate and auth failures closely.

4. **Rollback plan**
   - Keep SQL rollback scripts ready:
     - Restore previous policies
     - Temporarily relax specific policy only if incident occurs

Deliverable: production-safe RLS deployment with rollback readiness.

---

## Suggested Execution Order (Practical)

1. Phase 0 (prep)
2. Phase 1 (enable + remove unrestricted)
3. Phase 2 (server writes)
4. Phase 3 (server reads)
5. Phase 4 (strict policies)
6. Phase 5 (rollout)

---

## Definition of Done

- No unrestricted policy remains on `public.profiles`.
- Browser no longer performs direct privileged writes to `profiles`.
- Sensitive profile data not exposed via client-side direct queries.
- All core user/admin journeys pass after RLS enforcement.
