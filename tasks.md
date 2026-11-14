# Implementation Plan: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a single-page, browser-only app built with HTML, CSS, and Vanilla JavaScript. It supersedes the existing dashboard in `index.html`, `css/style.css`, and `js/app.js` (the only shipped CSS and JS files, per Requirement 13). The implementation is layered inside a single JavaScript IIFE:

1. **Storage layer** — Local Storage helpers with safe-load/recovery.
2. **Pure logic layer** — validation, aggregation, and sorting as stateless functions, separated from DOM and storage so they are directly testable with property-based tests.
3. **State + mutations** — module-level state (`transactions`, `categories`, `sortOrder`, `selectedMonth`, `chartInstance`) and mutation functions that validate, update state, persist, and re-render.
4. **Renderers** — balance, transaction list, Chart.js pie chart, and monthly summary, orchestrated by a single `renderAll` called after every mutation.
5. **Event wiring + init** — wires user actions and boots the app with a capability/unsupported-browser check.

Chart.js v4 is loaded via CDN for the pie chart only (a scoped exception to Requirement 10.1). Pure functions are exposed on a `window.ExpenseApp` namespace so property-based tests can import them without touching the DOM or real Local Storage. Each pure-logic task exposes its own functions to that namespace as it creates them.

## Tasks

- [ ] 1. Set up HTML markup and include Chart.js
  - [ ] 1.1 Replace index.html with the Expense Visualizer semantic markup
    - Replace the existing dashboard markup with: a balance card at the top, an add-transaction form (item name `maxlength=100`, amount `min=0.01 max=999999999.99 step=0.01`, category `<select>` populated from the category set, submit button), a custom-category form (name input `maxlength=50` + add button), a sort control `<select>` ("Amount (low to high)" / "Category (A–Z)") above the list, a scrollable transaction list container, a chart `<canvas>` with an empty-state placeholder element, a monthly summary section, a feedback area, and the footer. Include the Chart.js v4 CDN `<script>` before `js/app.js` (e.g. `https://cdn.jsdelivr.net/npm/chart.js`).
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 6.1_

- [ ] 2. Implement CSS styling and responsive layout
  - [ ] 2.1 Replace css/style.css with the Expense Visualizer styles
    - Style the balance card, form inputs, buttons, transaction list (scrollable with `overflow-y: auto` and a max height), chart container, and monthly summary. Ensure interactive controls have tap targets of at least 44×44 CSS pixels and the layout collapses to a single column with no horizontal scroll at viewport widths ≤640px.
    - _Requirements: 2.3, 6.1, 6.2_

- [ ] 3. Implement the storage layer
  - [ ] 3.1 Implement Storage helpers and safe-load routines in js/app.js
    - Define `STORAGE_KEYS` (`expense_transactions`, `expense_categories`, `expense_sort_order`). Implement `Storage.get(key, fallback)` and `Storage.set(key, value)` (JSON in/out with try/catch; `set` returns `false` on failure). Implement `safeLoadTransactions()` and `safeLoadCategories()` that wrap `JSON.parse` in try/catch, validate the parsed shape is an array, and return `{ data, recovered }` (empty list + `recovered: true` on corruption or wrong shape).
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 3.2 Write property test for persistence round-trip
    - **Property 10: Persistence round-trip preserves transactions and categories**
    - Generate arbitrary transaction sets and category sets, serialize through the storage helpers using an in-memory mock, deserialize back, and assert equivalence.
    - **Validates: Requirements 5.2, 7.3**

  - [ ]* 3.3 Write property test for corrupted storage recovery
    - **Property 11: Corrupted storage yields an empty recovered state**
    - Feed malformed/unparseable storage values and non-array parsed shapes, and assert the load routine returns an empty list without throwing and signals recovery.
    - **Validates: Requirements 5.5**

- [ ] 4. Implement pure logic functions
  - [ ] 4.1 Implement validation functions in js/app.js
    - Implement `validateAmount(rawAmount)` (rejects non-numbers, `NaN`, `Infinity`, negatives, zero, values >999999999.99, and values with more than two decimal places — checking decimal precision on the string representation before numeric conversion). Implement `validateTransaction({ name, amount, category })` returning `{ valid, errors[] }` (rejects empty/whitespace name or category). Implement `validateCategoryName(name, existingCategories)` (rejects empty/whitespace, >50 chars, and case-sensitive duplicates). Trim names and strip leading/trailing whitespace. Expose these on `window.ExpenseApp` for testing.
    - _Requirements: 1.4, 1.5, 7.1, 7.4_

  - [ ]* 4.2 Write property test for valid transaction addition
    - **Property 1: Valid transaction addition**
    - For valid names (1–100 non-whitespace chars), valid amounts (0.01–999999999.99, ≤2 decimals), and existing categories, assert exactly one transaction is appended matching the submission, with a creation-day date and unique id, increasing the list length by one.
    - **Validates: Requirements 1.3**

  - [ ]* 4.3 Write property test for invalid transaction rejection
    - **Property 2: Invalid transaction submissions are rejected**
    - For empty/whitespace name or category, or amounts that are non-positive, over the max, or with >2 decimals, assert the submission is rejected and the list is unchanged.
    - **Validates: Requirements 1.4, 1.5**

  - [ ]* 4.4 Write property test for custom category validation
    - **Property 9: Custom category validation and addition**
    - For non-empty names (1–50 chars) not already present, assert the category is appended; for empty/whitespace, >50 chars, or duplicates, assert the category set is unchanged and an error is reported.
    - **Validates: Requirements 7.1, 7.4**

  - [ ] 4.5 Implement aggregation and sorting functions in js/app.js
    - Implement `computeBalance(transactions)` (sum of amounts rounded to 2 decimals via fixed-precision rounding, e.g. `Math.round((sum + Number.EPSILON) * 100) / 100`; zero on empty), `groupByCategory(transactions)` (`{ category: total }`), `groupByMonth(transactions)` (`{ "YYYY-MM": { transactions, total } }`, only months with ≥1 transaction), and `sortTransactions(transactions, sortOrder)` (returns a new sorted copy: amount ascending, or category ascending A–Z; never mutates input). Expose these on `window.ExpenseApp`.
    - _Requirements: 3.2, 4.2, 8.1, 8.2, 9.1, 9.2, 9.4_

  - [ ]* 4.6 Write property test for balance computation
    - **Property 3: Balance equals the sum of amounts, rounded to two decimals**
    - For any transaction set (including empty), assert the balance equals the sum of amounts rounded to 2 decimals and is zero when empty.
    - **Validates: Requirements 3.1, 3.2, 3.4**

  - [ ]* 4.7 Write property test for chart slice aggregation
    - **Property 4: Chart slices aggregate by category and total to the balance**
    - For any transaction set, assert each slice equals the category sum, the sum of all slices equals the balance, every slice is labeled by category, and there are no slices when empty.
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 4.8 Write property test for monthly grouping
    - **Property 7: Monthly grouping partitions by calendar month with correct totals**
    - For any transaction set, assert every transaction maps to exactly one year-month, only non-empty months appear, and each month's total equals the sum of its transactions' amounts.
    - **Validates: Requirements 8.1, 8.2**

  - [ ]* 4.9 Write property test for sorting
    - **Property 8: Sorting preserves the multiset and orders by the selected key**
    - For any transaction set and either sort order, assert the sorted list is a permutation of the input (multiset equal — nothing added, removed, or altered) and ordered non-decreasingly by the selected key.
    - **Validates: Requirements 9.1, 9.2**

- [ ] 5. Implement state and mutations
  - [ ] 5.1 Implement in-memory state and mutation functions in js/app.js
    - Implement module-level state (`transactions`, `categories` defaulting to `["Food", "Transport", "Fun"]`, `sortOrder` defaulting to `"amount"`, `selectedMonth`, `chartInstance`). Implement `addTransaction({ name, amount, category })` (validate, assign id `${Date.now()}-${random}` + auto creation-day date `YYYY-MM-DD`, append, persist, return `{ ok, error? }`), `deleteTransaction(id)` (filter out by id, persist), `addCustomCategory(name)` (validate via `validateCategoryName`, append + persist, return `{ ok, error? }`), and `setSortOrder(order)` (persist). On `Storage.set` failure, keep in-memory data intact and surface a failure message.
    - _Requirements: 1.3, 1.6, 2.4, 5.2, 5.4, 7.1, 7.3, 9.4_

  - [ ]* 5.2 Write property test for deletion
    - **Property 5: Deletion removes exactly the targeted transaction**
    - For any transaction list and any transaction in it, assert deletion reduces the length by exactly one and the deleted id no longer appears in the list.
    - **Validates: Requirements 2.4**

- [ ] 6. Implement renderers and Chart.js integration
  - [ ] 6.1 Implement renderBalance and renderList in js/app.js
    - `renderBalance()`: display the balance rounded to 2 decimals (zero on empty). `renderList()`: render exactly one entry per stored transaction (sorted by the current `sortOrder` via `sortTransactions`) showing name, amount, category, and a delete control; show an empty-state message when none; wire delete controls to `deleteTransaction` + `renderAll`.
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 3.1, 3.3, 3.4_

  - [ ]* 6.2 Write unit test for transaction list rendering
    - **Property 6: Transaction list rendering reflects the current stored state**
    - Against a jsdom DOM, assert the rendered list contains exactly one entry per stored transaction — no more and no fewer.
    - **Validates: Requirements 2.1**

  - [ ] 6.3 Implement the Chart.js pie chart manager in js/app.js
    - Create a single reusable `Chart` instance (updated in place via `chart.data` + `chart.update()`, not destroyed/recreated). Use `groupByCategory` for slice values and category labels; use the built-in legend (category names) and tooltips (category + amount/percentage). Show the empty-state placeholder ("No spending data yet") and hide the canvas when no transactions. Guard with `typeof Chart === "undefined"` to show a fallback message if the CDN fails while the rest of the app keeps working.
    - _Requirements: 4.1, 4.3, 4.4, 12.3_

  - [ ] 6.4 Implement the monthly summary renderer and renderAll orchestrator in js/app.js
    - `renderMonthlySummary()`: list months (year + month) with totals from `groupByMonth`; selecting a month reveals that month's transactions (name, amount, category); show an empty-state message when none. `renderAll()`: single orchestrator recomputing balance, list, chart, and monthly summary from current state; call after every mutation to meet the 100ms update budget.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 3.3, 4.3, 12.1, 12.2, 12.3_

- [ ] 7. Wire event handlers and initialization
  - [ ] 7.1 Wire event handlers, init entry point, and capability check in js/app.js
    - Wire form submit (validate → `addTransaction` → clear form fields → `renderAll`), delete, custom-category add, sort change (re-render the list within 1s), and month selection. Implement `init()`: load transactions/categories/sortOrder via the safe-load routines (display a recovery message when `recovered` is true), populate the category selector, set the default sort to amount, create the Chart instance, and `renderAll`. Run a capability check (`localStorage`, `JSON`, and Chart.js presence); if a required capability is missing, show an unsupported-browser message instead of initializing. Confirm `window.ExpenseApp` exposes all pure functions for tests.
    - _Requirements: 1.1, 1.2, 1.6, 5.3, 9.3, 9.4, 10.1, 10.2, 10.3, 11.3, 13.1, 13.2_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Write integration and smoke tests
  - [ ]* 9.1 Write integration tests for persistence
    - Pre-seed `localStorage`, initialize the app in jsdom, and assert stored transactions render on load; use a throwing storage mock to verify in-memory data is retained and a failure message appears.
    - _Requirements: 5.3, 5.4_

  - [ ]* 9.2 Write integration test for Chart.js data
    - Initialize with seeded data (jsdom + Chart.js mocked or a real canvas shim) and assert the chart's data matches `groupByCategory`, including the empty state when no transactions exist.
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 9.3 Write static and smoke checks
    - Assert at most one CSS file in `css/` and one JS file in `js/`; assert no runtime framework and no `fetch`/`XHR`/network calls in `app.js`; assert the app initializes when `index.html` is opened from `file://` with no build step.
    - _Requirements: 10.1, 10.2, 10.3, 13.1, 13.2_

## Notes

- Tasks marked with `*` are optional (test sub-tasks) and can be skipped for a faster MVP; core implementation sub-tasks are never optional.
- Each task references specific requirement clauses for traceability; full implementation details live in the design document.
- The pure logic layer (validation, aggregation, sorting) is separated from DOM and storage so it can be tested with property-based tests using fast-check; pure functions are exposed on `window.ExpenseApp` for test import.
- All JavaScript is consolidated into the single `js/app.js` file and all CSS into the single `css/style.css` file to satisfy the file-structure constraint (Requirement 13); test and dev tooling live outside the shipped `js/` and `css/` directories.
- Chart.js is the only external library (a scoped exception to Requirement 10.1), loaded via CDN for chart rendering only.
- Checkpoints ensure incremental validation after layers are wired together.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1"] },
    { "id": 1, "tasks": ["4.1", "3.2", "3.3"] },
    { "id": 2, "tasks": ["4.5", "4.2", "4.3", "4.4"] },
    { "id": 3, "tasks": ["5.1", "4.6", "4.7", "4.8", "4.9"] },
    { "id": 4, "tasks": ["6.1", "5.2"] },
    { "id": 5, "tasks": ["6.3", "6.2"] },
    { "id": 6, "tasks": ["6.4", "9.2"] },
    { "id": 7, "tasks": ["7.1"] },
    { "id": 8, "tasks": ["9.1", "9.3"] }
  ]
}
```
