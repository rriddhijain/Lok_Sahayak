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
