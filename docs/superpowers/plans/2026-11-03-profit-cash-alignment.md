# Saldo Kas Utama setelah pembagian laba Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make both Arus Kas views show the same ending Kas Utama after the latest finalized profit allocation, without auto-writing financial data.

**Architecture:** Reuse the existing monthly profit/loss and loss-carry calculation, with read-only Arus Kas API routes for users who do not have Laporan Keuangan access. Inject the computed allocation into the in-memory sheet calculations for the first period only; keep the allocation rows hidden on the general Arus Kas page.

**Tech Stack:** React, TypeScript, TanStack Query, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-03-profit-cash-alignment-design.md`

## Global Constraints
- Do not write automatically to the saved financial sheet.
- Do not close books, alter transactions, or change distribution percentages.
- Keep individual profit-share details hidden on the general Arus Kas page.
- Apply the derived allocation only when the source month is final.

## Review Focus
- A previous month becomes final without a close-book snapshot: the allocation still derives from its latest live profit.
- A month with no saved report reconstructs its opening balance from historical months with the same derived allocations as the visible prior-month cash close.
- Prior losses reduce distributable profit before the 40/60 split.
- A profit change invalidates/recomputes the displayed cash balance without re-saving manual share rows.
- A successful finance-sheet save immediately updates cached read-only Arus Kas profit inputs; do not leave a fresh but stale cache value.
- Users with only Arus Kas read permission can load the calculation through Arus Kas read endpoints.
- Unfinalized source month does not produce a new automatic cash deduction.

---

### Task 1: Read-only profit calculation and allocation overlay

**Files:**
- Create: `src/lib/financialSheetCache.ts`
- Modify: `src/lib/labaBulan.ts`
- Modify: `src/pages/TabelArusKas.tsx`
- Test: relevant `src/lib/labaBulan.test.ts`, `src/lib/financialSheetCache.test.ts`, and `src/pages/TabelArusKas.integration.test.tsx`

**Interfaces:**
- Provide a hook/helper that resolves the finalized previous month's distributable profit using the existing `usePembagianLaba` calculation and supports Arus Kas read-only endpoints.
- Provide in-memory cell values for `pl_admin`, `pl_owner`, and the derived total at the current month's first reporting day; do not mutate persisted sheet data.

- [x] Add tests proving changed previous-month profit changes the derived amount, prior losses are carried, and non-final months produce no override.
- [x] Confirm a past reporting month is treated as final without a close-book snapshot when `bulanan.final` is false.
- [x] Add integration tests proving both views calculate the same ending cash, general Arus Kas still hides share rows, and reconstructed opening balances carry derived distributions across consecutive months.
- [x] Verify a saved financial sheet refreshes the read-only Arus Kas cache immediately.
- [x] Implement the minimal read-only endpoint path and derived overlay.
- [x] Run the focused tests and the full frontend test suite.

### Task 2: Verify build and presentation

**Files:**
- Review: `src/pages/TabelArusKas.tsx`
- Verify: local rendered Arus Kas page with mocked read-only API responses

- [x] Run `yarn build` using `.env.production`.
- [x] Capture mobile and desktop screenshots of both views using fixtures/mocks, with different stored versus current profit values to prove the updated balance.
- [x] Review the final diff and confirm no API write, close-book, or distribution-detail disclosure was introduced.

### Task 3: Publish for review

- [ ] Commit and push the implementation, then open a PR against `main`.
- [ ] Verify exact-head CI and report that production remains unchanged until the owner later requests merge.
