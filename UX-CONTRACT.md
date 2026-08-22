# UX Contract

## Product context

- Audience: Pegawai lapangan dan Superadmin.
- Primary jobs: Mengirim laporan harian; memantau kepatuhan dan data operasional.
- Target market(s): Operasional internal Indonesia.
- Active locales: `id-ID`.
- Language/content register and native-review policy: Bahasa Indonesia operasional; istilah bisnis mengikuti spesifikasi proyek.
- Timezone/calendar policy: Gregorian, tanggal bisnis `Asia/Jakarta`, timestamp tersimpan UTC.
- Accessibility target: WCAG 2.2 AA.

## Business-context sources

| Domain / scope | Authoritative source | Source type | Reviewed date |
|---|---|---|---|
| Permission model | `docs/superpowers/specs/2026-08-21-sistem-pelaporan-kegiatan-pegawai-design.md` section 7 | Product spec | 2026-08-22 |
| Data lifecycle | Spec sections 5, 8, 9 and `docs/testing/p1-api-contract.md` | Domain/API contract | 2026-08-22 |
| Deletion / retention | Spec sections 5.3, 9.6, 17 | Product assumption | 2026-08-22 |
| Billing / payment | Not applicable | — | 2026-08-22 |
| Legal / regulatory copy | Not specified; no legal claims are added in UI | Product boundary | 2026-08-22 |
| Market / content conventions | Project specification and current Indonesian UI vocabulary | Product spec | 2026-08-22 |

## Visual contract

- Project `DESIGN.md`: `DESIGN.md`.
- Token ownership model: Existing runtime CSS variables remain canonical.
- Runtime design-system/token source: `frontend/src/index.css`.
- Mapping/export/adapters: `DESIGN.md` semantic token → CSS variable → shared/component class.
- Token drift gate: `designmd lint`, premium audit, and browser comparison with `docs/design/concepts/`.
- Supported themes: Light only for the prototype.
- Design-context owner/review policy: Update this contract and runtime tokens together for durable changes.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | Native `select` in shared fields | This contract | native | keyboard + browser popup |
| Date | Native `input[type=date]` | Spec section 5.4 and this contract | native | locale + browser |
| Form | Shared field/button CSS plus feature form | This contract | report-create / master-edit / login | validation tests + browser |
| Scrollbar | Global application stylesheet | `DESIGN.md` | stable-gutter geometry | computed style + browser |
| Toast | Shared inline `Notice` region | `frontend/src/components/Notice.jsx` and this contract | success / error / status | live-region test |
| CRUD | Feature service + canonical page patterns | API contract + this contract | report-create-to-detail / master-stay | full-flow tests |

Native select/date ownership accepts operating-system popup geometry for the one-week local prototype. A future authored picker/listbox must replace this decision centrally.

## Component behavior

| Component | Default | Hover | Focus | Active | Disabled | Busy | Error |
|---|---|---|---|---|---|---|---|
| Button | stable 44px control | semantic tone shift | 3px blue ring | subtle inset/translate | non-interactive | label width reserved | inline persistent notice |
| Icon button | icon + accessible name | surface tint | visible ring | pressed tone | non-interactive | spinner if applicable | nearby notice |
| Input | white surface + border | border darkens | blue ring | n/a | muted surface | stable adornment | text + `aria-invalid` |
| Secret input | masked + reveal button | as input | input/button rings | toggle state | n/a | n/a | generic auth error |
| Search | app clear + 300ms when remote | as input | visible ring | n/a | n/a | reserved indicator | no-results/error distinct |
| Textarea | resize none | border darkens | blue ring | n/a | muted | stable | text + association |
| Table/list | rule-separated rows | row tint | link/button ring | n/a | n/a | stable frame | retry/empty copy |

## Dataset navigation

- Admin report and employee-history tables use server pagination with an explicit total.
- Exploratory lists: Render bounded lists from the API.
- URL state: Date filters should become URL-backed when full server pagination/filtering is expanded; current prototype keeps transient date range in page state.
- Page size: Backend default is exposed through previous/next pagination controls.
- Empty/no-results/error/loading treatment: Distinct copy, stable table frame, retry where available.
- Back/scroll restoration: Detail routes return to their owning list.
- Selection scope: Not applicable; no bulk actions.

## Flow ledger

| Operation | Trigger | Pending | Success destination | Success feedback | Failure recovery | Focus outcome | Source ref |
|---|---|---|---|---|---|---|---|
| Create report | Kirim laporan | Stable busy button | Report detail | Detail page proves saved data | Preserve form + inline error | Detail heading | Spec 9.4 |
| Edit master | Simpan perubahan | Stable busy button | Stay on Master Data | Inline status | Keep editor open + error | Editor/list context | API contract |
| Toggle status | Aktifkan/Nonaktifkan | Disable relevant action | Stay on list | Inline status | Inline error + retry action | Updated row/list | Spec 8 |
| Search/filter | Date fields | Stable list frame | Same route | Result count | Empty/error copy | Filter/list heading | API contract |
| Upload | Pilih foto | File row state | Stay in report form | Preview row | Per-file inline error/remove | Upload zone/file row | Spec 9.3 |
| Cancel/back | Batal/Kembali | None | Owning route | None | Unsaved guard target for later | Originating context | Route structure |

No report deletion exists in the MVP. Master “nonaktif” is reversible and must never be presented as permanent deletion.

## Navigation and responsive behavior

- Route document title policy: `{Halaman} — Sistem Pelaporan`.
- Route error / 403 page behavior: App-owned access-denied page with link to an allowed destination.
- Breadcrumb/tab/route-state policy: Sidebar navigation owns top-level routes; back links own detail-to-list transitions.
- Sidebar/drawer/bottom-sheet transformation: Persistent desktop sidebar becomes compact top shell and horizontally scrollable navigation under 860px.
- Responsive table strategy: Horizontal scroll with visible cue; do not silently hide columns.
- Truncation/full-value access: Descriptions wrap; identifiers are not clipped without a detail path.
- Focus restoration and sticky-obstruction policy: `scroll-margin` and visible focus; no sticky bottom bar on mobile.

## Overlays and feedback

- Dialog primitive: None required by current MVP; do not use browser dialogs.
- Destructive confirmation levels: No irreversible UI action exists. Status toggle is reversible and does not use danger-red confirmation.
- Toast placement/duration/deduplication: Current canonical feedback is persistent inline Notice, not toast.
- Alert/banner scope and persistence: Form/page errors remain until corrected or retried.
- Tooltip delay/dismissal: Tooltips are not required because icon-only opaque actions are avoided.
- Unsaved-changes behavior: Required future enhancement for long/edit forms; current create flow preserves values on request error.
- Layer/z-index contract: sticky 100, dropdown 200, popover 300, header 400, backdrop 500, dialog 600, drawer 700, command 800, toast 900.

## Async and resilience

- Mutation default: Pessimistic.
- Idempotency and duplicate-submit policy: Submit buttons disabled and busy until response.
- Auto-save/draft recovery: Not implemented in prototype.
- Offline/read-stale/write behavior: Preserve entered form data; show actionable error.
- Retry/backoff/timeout behavior: Manual retry; dashboard has manual refresh and 30-second polling.
- Version conflict and multi-tab behavior: Backend remains authoritative; no optimistic editing.
- Session expiry/re-authentication: 401 returns to login through auth boundary; do not expose protected data.
- Long-running progress and return path: Not applicable.
- Stale-request cancellation/invalidation and pending-state ownership: Feature request owns its state; future remote search must use AbortController.
- Dialog/form preservation and retry after mutation failure: Keep form values and inline error.

## Validation

- Schema/validation layer: Backend validation is authoritative; frontend performs fast required/format checks.
- Trigger timing: Submit, then field correction.
- Error summary/inline policy: Short forms use a persistent inline summary; per-field association is added where validation is field-specific.
- Server error mapping: Safe Indonesian message; never raw stack/secret.
- Sensitive-value handling: Password masked by default, reveal is explicit, never logged or stored in route.
- Forms use `noValidate`, block duplicate submit, and preserve non-sensitive values after server errors.

## Permission and clipboard

- Permission UI strategy: Hide irrelevant navigation by role; direct forbidden routes show 403.
- Clipboard copy policy: Not applicable.
- Disabled-state explanation: Disabled dependent RW has visible context through the Desa-first flow.

## Migration status

- Migration ledger location: This contract and the current UI redesign task.
- Canonical primitives and owners: AppShell, Icon, PageState, Notice, runtime CSS tokens.
- Current risk-prioritized slices: Auth → report create/upload → admin monitoring → master/status.
- Legacy import/token enforcement: No screen-local palette or browser dialog.
- Rollout/rollback and removal gates: All frontend tests/build/browser checks must pass before the old shell/styles are considered retired.

## Verification

- Required static commands: frontend lint/test/build, project test, premium audit, anti-pattern grep.
- Browser/device/locale/theme matrix: Desktop 1440×900 and mobile 390×844, Indonesian, light, reduced motion.
- Accessibility checks: Keyboard focus, semantic labels, form errors, overflow, touch target baseline.
- Component-state/visual regression coverage: Browser screenshots compared with `docs/design/concepts/`.
- Canonical sibling flow used for comparison: Employee history and Admin report list.
- Project audit command/result: Static premium auditor timed out in its regex parser; equivalent anti-pattern checks were run manually and runtime verification remains in the browser matrix.
- CRUD full-flow evidence: Existing unit/integration tests plus browser smoke.
- Failure-path evidence: Login error, dashboard/list error state, file validation tests.
