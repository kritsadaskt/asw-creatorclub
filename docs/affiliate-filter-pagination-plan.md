# Affiliate Page: Filter Panel and Pagination (revised)

Plan revised to follow current code in `AffiliatePage.tsx` and `affiliate.ts`.

---

## Current code reference

**File**: [src/app/components/affiliate/AffiliatePage.tsx](src/app/components/affiliate/AffiliatePage.tsx)

- **Lines 25–30**: `AffiliateProjectList` state: `projects`, `isLoading`, `error`, `selectedProject`, `isMaterialsOpen`.
- **Lines 31–42**: `getStatusLabel(status?)` — keep as-is; use for status filter options and display.
- **Lines 84–98**: Ternary: loading → spinner; error → error box; `projects.length === 0` → "ขณะนี้ยังไม่มีโครงการสำหรับ Affiliate"; else → table.
- **Lines 99–176**: Current table block: single `<div className="overflow-x-auto ...">` with `<table>`, `<thead>`, `<tbody>` mapping `projects.map((project) => ...)` (line 116).

**Data**: [src/app/utils/affiliate.ts](src/app/utils/affiliate.ts) — `AffiliateProject` has `id`, `name`, `description`, `projectStatus?: 1|2|3`, `commission`, etc. No API changes.

**UI components** (unchanged): `Input`, `Label`; `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`; `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext`.

---

## 1. Filter panel (above the table)

- **Placement**: Only when there are projects. Insert **inside the final else branch** (after line 99, before the `<div className="overflow-x-auto">`), so: header → filter panel → table (or "no results") → pagination.
- **Filters**:
  - **Search**: One text input; filter by `name` and `description` (case-insensitive substring). Use `Input` + `Label` from `../ui/input` and `../ui/label`.
  - **Status**: One select with options "ทั้งหมด" (value `'all'`), "RTM" (1), "New" (2), "Pre-Sale" (3). Use `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` from `../ui/select` and `Label`.
- **Layout**: One row (e.g. `flex flex-wrap gap-4`), responsive. Optional: "ล้างตัวกรอง" that sets search to `''` and status to `'all'`.

---

## 2. Pagination

- **Default**: 10 items per page.
- **State**: `page` (1-based), `itemsPerPage = 10`. Reset `page` to 1 when `searchQuery` or `statusFilter` change (e.g. in handlers or `useEffect`).
- **Data flow** (all inside the same else branch where we currently show the table):
  1. `filteredProjects = projects` filtered by search (name/description) and status (`projectStatus`).
  2. `totalPages = Math.ceil(filteredProjects.length / itemsPerPage)` (min 1).
  3. `paginatedProjects = filteredProjects.slice((page - 1) * itemsPerPage, page * itemsPerPage)`.
  4. If `filteredProjects.length === 0`: show message "ไม่พบโครงการที่ตรงกับตัวกรอง" (no table, no pagination).
  5. Else: render table rows from `paginatedProjects` (replace `projects.map` with `paginatedProjects.map`), then render pagination below the table.
- **Pagination UI**: Use existing `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationPrevious`, `PaginationNext` (and optionally `PaginationLink` for page numbers). Previous/Next disabled when `page === 1` or `page >= totalPages`. Optional: "Showing X–Y of Z" text.

---

## 3. Implementation checklist

- **Imports**: Add `Input`, `Label`; `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`; `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext` from the correct `../ui/*` paths.
- **State** (in `AffiliateProjectList`): `searchQuery` (string, `''`), `statusFilter` (`'all' | 1 | 2 | 3`, default `'all'`), `page` (number, 1), `itemsPerPage` (number, 10).
- **Derived**: `filteredProjects` (use `projects`; filter by search on name/description and by status); `totalPages`; `paginatedProjects`.
- **Reset page**: When updating `searchQuery` or `statusFilter`, set `page(1)`.
- **Conditional UI** (inside the branch where `projects.length > 0`):
  - Filter panel (always when projects exist).
  - If `filteredProjects.length === 0`: single empty-state message; no table, no pagination.
  - Else: table with `paginatedProjects.map` + pagination bar below.

---

## Summary

- **Filter panel**: Search (name/description) + Status select (ทั้งหมด, RTM, New, Pre-Sale), above the table, only when `projects.length > 0`.
- **Pagination**: Client-side; 10 per page; slice `filteredProjects`; show table from `paginatedProjects`; Previous/Next (+ optional page numbers / "X–Y of Z").
- **Components**: Existing `Input`, `Label`, `Select`, `Pagination` from `../ui/*`.
- **State**: `searchQuery`, `statusFilter`, `page`, `itemsPerPage`; reset `page` on filter change.
