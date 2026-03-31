# GEMINI.md - Project Analysis & Strategic Plan

## Project Identity & Context
**Name:** AssetWise - Creator Club
**Purpose:** A platform for managing creators/influencers for a Thai real estate company (AssetWise). The system handles registration workflows, affiliate link generation, "Friend-Get-Friends" (FGF) referral processing, and an admin dashboard for moderation.
**Environment:** Deployed on Vercel/Netlify at a specific sub-path (`/creatorclub`).

---

## Technical Architecture & Stack

As a Senior Fullstack Engineer, looking at the `.json`, config, and core architecture, here is the breakdown of the application:

### 1. Frontend Layer
- **Framework:** Next.js 16.2 (App Router) with React 18.3.
- **Styling:** Tailwind CSS 4 integrated via PostCSS, enriched with **shadcn/ui** (Radix UI primitives).
- **Animations:** Framer Motion (`motion`) and Anime.js for fluid user interactions.
- **Forms & Validation:** `react-hook-form` paired with input UI elements like select, OTP, and date-pickers (`react-day-picker`).
- **Data Visualization:** Recharts for analytics and `xlsx` for exporting reports.

### 2. Backend & Data Layer (Serverless)
- **Database / BaaS:** Supabase (`@supabase/supabase-js` v2) serving as the primary PostgreSQL database and object storage (e.g., `profile-images`). **No ORM** is used; instead, centralized data access is routed through `src/modules/utils/storage.ts`.
- **API Routes (Next.js):** RESTful endpoints handling everything from account recovery (OTP) to admin approval actions and CRM integrations.
- **Mailing:** Custom SMTP integration using `Nodemailer` for transactional emails (approvals, rejection, OTPs).
- **3rd Party API Integration:** Communication with the "CIS CRM" system to push qualified FGF leads directly into the real estate sales funnel.

### 3. Authentication & Authorization
- **Multi-Strategy:** 
  - Standard Email/Password protected by SHA-256 (Web Crypto API).
  - OAuth via Facebook SDK v18 (optimized for Supabase storage fallback for profile pictures).
- **Session Management:** Stored inside HTTP-only cookies (`asw_session`).
- **Role-Based Access Control (RBAC):** Users are assigned `creator` or `admin` roles.
- **Route Guarding:** `middleware.ts` enforces Basic Auth specifically for admin routes (`/creators`).

---

## Architectural Guidelines & "Gotchas" (Rulebook)

To maintain code quality and ensure scalability for our next steps, the following parameters must be respected:

1. **Sub-Path Routing Strictness:** Because the app lives on `/creatorclub`, *all* intra-app navigation and asset paths must wrap through `publicPath.ts` or leverage Next.js `<Link>`.
2. **Database Centralization:** All new database transactions must be localized within `src/modules/utils/storage.ts` to prevent query fragmentation and maintain security.
3. **Hardcoded Middleware Auth:** We must be extremely cautious around `src/middleware.ts` where Basic Auth credentials sit. Structural changes here risk locking administrators out.
4. **Environment Safety:** Pushing to production requires navigating the CIS CRM integration (`CIS_API_PROD` vs `CIS_API_UAT`). We must never leak test data into the production CRM.

---

## AI Agent (Gemini) - Next Steps & Readiness

I have fully ingested the repository surface area, the routing schema, the authentication state, and the core dependencies. 

**I am ready to proceed with your objectives.**
Whether it revolves around:
- **Refactoring:** Breaking down `storage.ts` or migrating SHA-256 to a stronger hashing algorithm.
- **Feature Build:** Adding new UI capabilities in the Admin panel or expanding the FGF lead tracking.
- **Optimization:** Improving the Tailwind CSS structure, adding deeper tests, or hooking up new CI/CD steps.

Please instruct me on the specific task you'd like to tackle next!
