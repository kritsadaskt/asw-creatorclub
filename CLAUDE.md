# CLAUDE.md — ASW CreatorClub

## Project Overview

Creator/influencer management platform for **AssetWise** (Thai real estate company). Manages creator registration and approval, affiliate link generation, friend-get-friends (FGF) referral leads, and an admin dashboard. Deployed at sub-path `/creatorclub`.

## Commands

```bash
npm run dev      # Next.js dev server
npm run build    # Production build
npm run lint     # ESLint
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router), React 18, TypeScript 5 |
| Styling | Tailwind CSS 4, shadcn/ui (Radix UI), Lucide icons |
| Animation | Motion 12, Anime.js 4 |
| Forms | React Hook Form 7, React Select 5, Input OTP |
| Data | Recharts 2, XLSX (Excel export), Date-fns 3 |
| Backend | Supabase JS 2 (PostgreSQL + Storage, no ORM) |
| Email | Nodemailer 8 (SMTP) |
| Auth | Facebook SDK v18, Web Crypto API (SHA-256), HTTP cookies |
| Notifications | Sonner 2 (toasts) |

## Project Structure

```
src/
  app/                          # Next.js App Router
    page.tsx                    # Landing page
    layout.tsx                  # Root layout (wraps SessionProvider)
    register/                   # Creator registration
    profile/                    # Creator profile management
    admin/
      dashboard/                # Admin creator approval UI
      projects/                 # Project CRUD
    creators/                   # Basic-auth protected creator directory
    affiliate/[[...slug]]/      # Affiliate link browsing
    friendgetfriends/[[...slug]]/ # FGF referral program
    account-recovery/           # OTP-based password reset
    api/                        # Route handlers (see API Routes below)
  modules/
    components/                 # 73 React components
      admin/                    # AdminDashboard, ProjectManagement
      landing/                  # LandingPage, Header, HeroBanner, Footer
      creator/                  # CreatorProfile, AffiliateGenerator
      affiliate/                # AffiliateBrowse
      friendgetfriend/          # FGF lead management
      ui/                       # shadcn/ui base components (30+)
      shared/                   # Shared components
    context/
      SessionContext.tsx         # Global auth state — exports useSession()
    types/
      index.ts                   # All TypeScript interfaces
    utils/
      storage.ts                 # ALL Supabase DB operations (673 lines) — check here first for data changes
      auth.ts                    # Cookie session read/write helpers
      facebook.ts                # Facebook OAuth flow
      password.ts                # SHA-256 hashing + verification
      friendgetfriend.ts         # CIS CRM API client
  lib/
    email/send-email.ts          # Nodemailer SMTP wrapper
    publicPath.ts                # basePath-aware path helper
    imgSrc.ts                    # Image src helpers
  middleware.ts                  # Basic Auth guard for /creators route
supabase/
  migrations/                    # SQL migration files
  functions/                     # Supabase Edge Functions
```

## Authentication

| Method | Implementation |
|--------|---------------|
| Session storage | HTTP-only cookie `asw_session` (base64 JSON), 30-day max-age |
| Facebook OAuth | `src/modules/utils/facebook.ts` — FB SDK v18, scope: `email,public_profile` |
| Email/Password | SHA-256 hash stored in `profiles.password_hash` |
| Admin routes | Basic Auth in `src/middleware.ts`, protects `/creators` |
| OTP recovery | 10-min expiry, SMTP delivery, routes under `/account-recovery/*` |
| Roles | `creator` \| `admin` |
| Auth hook | `useSession()` from `src/modules/context/SessionContext.tsx` |

> **Warning:** Basic Auth credentials are hardcoded in `src/middleware.ts:4-5` as `online:CreatorsClub26`.

## Database (Supabase, no ORM)

All CRUD operations live in `src/modules/utils/storage.ts`.

| Table | Key Fields |
|-------|-----------|
| `profiles` | Creator profiles. `status`: 0=rejected, 1=approved, 2=inactive, 3=pending. `type`: general\|resident\|partner |
| `projects` | Real estate projects. `type`: condo\|house. `status`: ready\|new\|sold_out |
| `campaigns` | Marketing campaigns with UTM tracking |
| `affiliate_links` | Creator-generated affiliate links |
| `fgf_leads` | FGF referral leads. `status`: new\|contacting\|verified\|uploaded |
| `fgf_lead_projects` | Junction table (FGF leads ↔ projects) |

**Storage buckets:** `profile-images`, `uploads`

## API Routes

```
POST  /api/send-password-otp                     Send OTP email
POST  /api/account-recovery/request              Initiate account recovery
POST  /api/account-recovery/verify-otp           Verify OTP code
POST  /api/account-recovery/reset-password       Reset password with verified OTP
PATCH /api/admin/creators/[id]/approval          Approve or reject a creator
POST  /api/admin/creators/[id]/email/approval    Send approval email to creator
POST  /api/admin/creators/[id]/email/rejection   Send rejection email to creator
POST  /api/admin/fgf-leads/[id]/cis              Push FGF lead to CIS CRM
POST  /api/creators/email/registration-pending   Send pending-review email
GET   /api/friendgetfriend/projects              Fetch projects available for FGF
```

All email routes use Nodemailer. In dev, if SMTP is unconfigured, OTP codes log to console.

## Environment Variables

```bash
# Public (browser-accessible)
NEXT_PUBLIC_BASE_PATH=/creatorclub
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
NEXT_PUBLIC_FACEBOOK_APP_ID=

# Server-only
CIS_API_UAT=            # Thai real estate CRM endpoint (UAT)
CIS_API_PROD=           # Thai real estate CRM endpoint (prod)
CIS_TOKEN=              # CIS auth token

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

See `.env.example` for the canonical list.

## Code Conventions

- **Client components:** Use `'use client'` directive — most components are client-side
- **Styling:** Tailwind CSS only — no CSS modules or styled-components
- **Path alias:** `@/*` maps to `src/*`
- **Naming:** PascalCase components, camelCase utils/hooks, UPPER_SNAKE_CASE constants
- **Interfaces:** PascalCase, all defined in `src/modules/types/index.ts`
- **Error handling:** try-catch + Sonner toast notifications
- **Language:** Thai UI strings and Thai email templates throughout

## Deployment

- **Primary:** Vercel (`vercel.json`)
- **Alternate:** Netlify (`netlify.toml`)
- **basePath:** `/creatorclub` — set in `next.config.mjs`, use `publicPath.ts` helper for all internal paths
- **Analytics:** Google Tag Manager `GTM-MM872QW`

## Known Gotchas

1. **Hardcoded Basic Auth** — `src/middleware.ts:4-5` has credentials inline. Don't move them without updating the middleware.
2. **SHA-256 passwords** — `src/modules/utils/password.ts` uses Web Crypto SHA-256, not bcrypt. Adequate for current use but not suitable for new auth flows requiring stronger security.
3. **Unencrypted session cookie** — `asw_session` is base64 JSON (not encrypted). Contains user ID and role.
4. **Monolithic storage.ts** — All DB operations (673 lines) are in one file. Always check here before adding new Supabase queries to avoid duplication.
5. **CIS API** — `POST /api/admin/fgf-leads/[id]/cis` hits the Thai real estate CRM. Use `CIS_API_UAT` env for testing; never hit prod CIS unintentionally.
6. **basePath** — All links and image `src` attributes must use `publicPath.ts` helpers or Next.js `<Link>` to respect the `/creatorclub` sub-path.
