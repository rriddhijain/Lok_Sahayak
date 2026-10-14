# Validation — manual orders and emergency reserve update

Checked on 14 October 2026 with Python 3.12, Node.js 22, Next.js 15.5.27, and an isolated SQLite database. No test database, generated receipt, or test dispatch is included in the project archive.

## Results

- Backend regression suite: **14 tests passed**. Existing workflows and the two added tests completed successfully.
- Frontend type checking: passed.
- Optimized production build: passed after the dependency overrides.
- Direct browser verification in the Codex browser: passed for both ordering modes, exact manual stock receipt, cancellation, invalid quantities, reserve visibility, reserve reload persistence, restoring safe limits, role-specific navigation, search, dispensing, forecast periods, bulletin analysis, bed editing, dispatch/rejection, and assistant responses.
- Browser error/warning log during those checks: empty.
- The standalone Playwright runner could not launch Chrome under this session’s environment restrictions; its full expanded script was not completed here. Direct browser checks were used instead. The script is included for rerunning in a normal local environment.

## New feature checks

Manual ordering:

- Catalog choices include medicines above the AI reorder level.
- Browser test selected Ceftriaxone with stock 160 and ordered exactly 7 units. Delivery changed stock to 167.
- Zero, negative, fractional, malformed, and out-of-range quantities are rejected.
- The backend calculates the supplier and price; the actual entered quantity determines eligibility for bulk pricing.
- Duplicate approved orders are blocked, and receiving/cancelling follows the existing workflow.
- Non-finite approval prices are rejected; optional missing bulk prices cannot crash the optimizer.
- Inventory Manager remains unable to place orders; Procurement Officer and Administrator retain purchasing access.

Emergency reserve:

- All four profiles were checked against matching catalog items.
- Related items receive increased safe limits; unrelated items retain baseline limits.
- Dengue browser check: Lactate 250 → 625, Saline 200 → 500. Inventory showed the same increased limit and low-stock status.
- Current stock stays unchanged on reserve activation.
- The banner lists affected items and deficits; summary counts and purchase calculations agree with the policy.
- Switching off restores baseline thresholds without overwriting database settings or compounding multipliers.
- The selected profile restores from saved application state and survives browser reload.
- State is published to memory after a successful database commit.
- Reserve events also refresh inventory/procurement work views.

## Scope and remaining limits

The UI and workflow changes are limited to manual ordering and reserve behavior, their shared calculations, related input guards, tests, and documentation. Baseline AI sizing and unrelated screens retain their existing behavior. Patched PostCSS and selector-parser dependencies are applied without upgrading the UI framework or changing styling.

The final npm audit still reports five high findings in the existing build-tool chain rooted in `braces` (braces, chokidar, micromatch, fast-glob, and Tailwind). The registry’s latest braces release is still 3.0.3, which the audit flags. Resolving these through the suggested Tailwind major upgrade would require unrelated styling migration, so that was not performed under the requested scope. These are not claimed fixed. No known functional failures were found in the checked workflows; testing cannot establish that every possible bug is absent.

The supplied application remains a local/demo inventory planning project. Original limitations such as selectable demo roles and estimated receipt shelf life remain documented in README.md. Docker/PostgreSQL deployment was not exercised in this environment.

## Re-run

From the project root, with the backend environment active:

```bash
python -m unittest discover -s tests -v
cd frontend
npm ci
npm run lint
npm run build
```

For the browser script, start the services with a disposable sample database, install Playwright as described in README.md, and run `npm run test:e2e`. Set `APP_URL` if testing on a port other than 3000.

## Previous project validation record

The following is the supplied project’s earlier record, preserved for context; it is not a claim that its original full browser runner was rerun for this update.

# Validation and change report

## Requested fixes

| Request | Implemented behavior |
|---|---|
| Approve order does nothing | Approval is saved; pending recommendation disappears; confirmation and order history appear. Inventory displays order-approved status, incoming quantity, estimated arrival date, and days remaining. Duplicate approval is rejected. |
| Difficult short forms | Main-screen labels use medicine/item code, purchasing/order planning, earliest-expiry dispensing, intensive care, health bulletin, daily usage, forecast period, and live updates. Technical identifiers remain internal. |
| Easier overall use | Existing layout, colours, cards, sidebar, charts, and primary functions retained; simpler descriptions and explicit empty/error/success states added. |
| Search bar | Matches medicine name, item code, category, batch number, hospital, and purchase recommendation fields; result counts, navigation, and clear action work. |
| Medicine temperature | Badge uses the medicine's configured temperature with a readable “Store at … °C” label. No fabricated 2–8 °C value. |
| Bed management | Editable availability is saved and checked against capacity and active reservations. |
| Reject dispatch | Saved dispatch is rejected and its beds released; a second rejection is blocked. |
| Change hospital | Reservation transfers to another hospital atomically; insufficient target capacity leaves the original reservation intact. |
| Forecast period | Requests and displays the selected count of future daily predictions; chart adapter uses actual backend history and future points. |
| Emergency reserve toggle | Saves state, updates readiness, raises trauma procurement planning buffers, and broadcasts the change. |
| Add health bulletin | Processes manual/example report text, checks matching medicines, saves alerts, and shows success/no-match/error results. |
| Stream connecting status | Follows actual connection open/error events and shows automatic retry state. |
| Active perspective | Inventory Manager is restricted to inventory; Procurement Officer to purchasing; Administrator to all screens. API policy and stream events respect the selected role. Selection persists after refresh. |
| Alert feed | Clear “Alerts & Recent Activity” label, plain descriptions, source/action expansion, category filters, and explicit auto-scroll state. |
| Preserve functionality | Existing modules retained; atomic dispensing also updates daily consumption and detects unusual usage. |
| Four-person explanation | `PRESENTATION_GUIDE.md` includes architecture, file responsibility, concepts, examples, speaking notes, demonstrations, and questions. |

## Verification

All regression checks use disposable SQLite databases. No test database or browser screenshot is included in the ZIP.

| Check | Outcome |
|---|---|
| Clean frontend install with `npm ci` | Passed after repairing the uploaded dependency lockfile |
| TypeScript check with `npm run lint` | Passed |
| Next.js production build with `npm run build` | Passed |
| Backend regression suite | 12 test methods passed on two fresh databases after final backend changes |
| Automated browser workflow | Passed on two fresh databases after final UI changes |
| Browser runtime errors | None observed in the tested workflow |
| Visual inspection | Checked the rendered layout; corrected visible raw assistant formatting and the misleading stock banner |
| ZIP integrity/source inclusion | Verified before delivery |

Backend coverage includes dashboard endpoints; 7/14/30/60/90-day forecasts; absent/short/full history; interval bounds; approval/receipt/cancellation and repeat-action blocking; negative quantities; bed limits; dispatch, reassignment and rejection; rollback on failed reassignment; completed reservations; expired-batch exclusion; atomic dispensing; insufficient-stock rejection; health bulletin alerts; assistant query categories; emergency reserve effects; state restoration; no-match search; and item-stock/batch-quantity consistency. Additional checks cover supplier-based delivery countdowns, today/overdue estimates, pending-order visibility, clearing incoming status after receipt, role-denied actions, and role-filtered events.

Browser coverage includes connected live updates; work-view restrictions, API denial checks, role persistence, and delivery estimates; matching/no-match search and clearing; temperature display; dispensing preview and confirmation; purchase approval and persistence after reload; order cancellation; forecast-period changes; uncertainty interval switching; emergency reserve toggling; example health-bulletin analysis; bed editing; patient dispatch; changing destination; rejecting dispatch; assistant responses; and visible failure/recovery when a data request is interrupted.

## Deployment boundaries

- Docker files and proxy configuration were corrected and reviewed, but Docker containers were not started in this environment. PostgreSQL/Milvus runtime behavior and Windows execution were not exercised.
- Forecast intervals and model metrics are statistical estimates, not clinical guarantees. No-history/short-history fallback scores should not be interpreted as validated predictive accuracy.
- Sample locations, stock, suppliers, and consumption are demonstration data. Travel time is estimated from distance and average speed; the radar is illustrative.
- Health reports are manually entered; there is no automatic agency subscription. The NLP is keyword-based and vectors use token hashing. Milvus is optional; local fallback vectors are process-local.
- Purchase delivery creates a demonstration batch with a 365-day sample shelf life. Real deployments should capture and validate actual manufacturer batch/expiry metadata.
- Work-view selection restricts screens, actions, and API requests, but is not authentication: users can still switch roles in the demo. Patient dispatch manages bed reservations, not ambulance messaging, admission treatment, or patient discharge.
- The assistant is rule-based and uses database facts. Live broadcasting assumes one backend process; multiple workers require a shared broker.
- These checks substantiate the tested local workflows; they do not certify a production hospital deployment or guarantee that all possible operating conditions are error-free.
