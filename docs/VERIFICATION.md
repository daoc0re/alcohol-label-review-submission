# Release verification — September 23, 2026

This report refers to the recovered and completed release, not just earlier conversation claims. The saved source archive was an early checkpoint: tests, fixtures, and project docs were restored before this run. Only the current checks below are treated as evidence.

## Automated checks

- `pnpm test`: **44 passed, 0 failed**, using Node's test runner. Covers text normalization, strict warning words/punctuation/heading, OCR confidence, independent candidates, conflicting values, metric conversions, proof, ranges/inequalities, missing evidence, conditional category rules, application validation, actual PNG/JPEG/WebP headers, oversized/truncated/unsupported input, animated WebP, and static-server security/path/method behavior.
- `pnpm test:ocr`: actual Tesseract engine and included image files; **8 scenarios passed**. No mocked recognized text. Detailed text, confidence, bounding boxes, outcomes and elapsed times are preserved in `reports/ocr-results.json`.
- `pnpm typecheck` and `pnpm build`: passed. Static production output includes same-origin worker/WASM/model, fixtures and application assets.

### Real OCR results

Measured in Linux, Node v24.19.0. Initialization: 0.305 seconds. The values below are sequential OCR-plus-comparison application times with the worker initialized (not Internet download latency).

| Synthetic case | Panels | Seconds | Observed outcome |
|---|---:|---:|---|
| Old Tom matching | 1 | 0.95 | Six applicable text fields Match; two manual checks remain |
| Altered alcohol + warning word | 1 | 0.75 | Alcohol and warning Mismatch |
| Stone's Throw capitalization | 2 | 0.87 | Six text fields Match across panels |
| Imported wine | 1 | 1.09 | All seven text fields Match, including country |
| Conflicting percentages | 1 | 0.74 | Alcohol Manual Review |
| Severe blur | 1 | 0.12 | No usable field evidence; no automatic text matches |
| Title-case warning heading | 1 | 1.04 | Warning Mismatch |
| Blank image | 1 | 0.20 | No recognized text |

The CLI integration deliberately records the comparison engine's missing-evidence results on blank/blurred input; the actual browser workflow stops earlier with an actionable unreadable-image error when recognized text is insufficient.

## Browser workflow checks

Chrome in the managed local preview, running the current source with same-origin OCR assets. This is a development environment, not a public deployment.

| Check | Result |
|---|---|
| Empty required fields | Actionable validation banner and field errors |
| Load example → real OCR → findings | Six text matches, two open manual checks; first displayed comparison **1.6s** including worker initialization |
| Expand finding → image evidence | Expected/observed text and correct brand highlight visible |
| Separate expected values on identical artwork | Original queued brand matched; different queued expected brand mismatched |
| Edit expected details after results | Findings invalidated immediately |
| Failed first job in batch | Blank-image job showed Error; next clear-label job completed (1.6s) |
| Cancel OCR → retry | “Review cancelled.” followed by successful fresh comparison |
| Actual file chooser: renamed document | Safely rejected as unsupported; no file-content interpretation |
| Actual file chooser: JPEG | Accepted as an additional panel and removable |
| Clear session | Details, artwork, findings and batch removed |
| Later warm single-label comparison | 0.8s displayed; not a percentile or performance guarantee |

The earlier checkpoint used `crypto.randomUUID()` for queue identifiers, which failed on an HTTP non-loopback test origin. Replaced with a session-local monotonic counter: IDs need uniqueness within the page, not cryptographic randomness. Batch behavior was rechecked afterward. Also added qualified-value handling so “less than 45%” cannot become an exact match to 45.

## Accessibility, layout, and privacy

Development-only audit harness: `tests/browser-harness.html`. axe-core 4.10.3, WCAG 2 A/AA and 2.1 A/AA tags.

- Completed-review desktop audit (viewport 1332): **0 automated violations**, document scroll width 1317.
- Completed-review mobile frame (viewport 390): **0 automated violations**, document scroll width 375.
- Mobile frame with root text enlarged to 200%: **0 automated violations**, no document-level horizontal overflow.
- axe flagged `aria-prohibited-attr` and `color-contrast` as **incomplete**, requiring human inspection; absence of violations is not a full pass on those rules. Formal screen-reader and Section 508 evaluation has not been performed.
- Labels, keyboard-operable controls/accordion semantics, visible focus, live announcements and non-color status labels are present. Desktop/mobile artwork and result presentation inspected visually. Mobile tests use a resized frame, not a physical phone.
- Audit found **no localStorage keys, sessionStorage keys, or IndexedDB databases**, and no external resources in the inspected application resource-timing entries. Source review found no review persistence, analytics, upload API, or external inference call. This is scoped evidence, not comprehensive traffic capture or a penetration test. Service-worker API was unavailable in the HTTP test context; no service-worker registration exists in source.
- `reports/mobile-audit.json`, `reports/zoom-audit.json`, and `reports/label-review-preview.jpg` retain current check evidence.

## Performance interpretation

The app starts its clock when OCR is requested and includes worker initialization when cold; artwork decoding/preparation happens before this clock. Same-origin initial model transfer, browser cache, CPU, device memory, number of panels and image difficulty all matter. These are small synthetic samples from one environment, **not real-label accuracy estimates or target-device latency percentiles**. The five-second expectation is considered and visibly monitored, not guaranteed. A 25-second per-panel limit and explicit cancellation are implemented; an actual forced-timeout UI scenario was not exercised in this run.

## Remaining validation boundaries

No real applicant/agency artwork, 200–300-job load test, deliberate browser memory exhaustion, penetration test, cross-browser/device matrix, screen-reader study, reliable glare/curvature recovery study, or legally certified label assessment was performed. No public hosting checks can be claimed before publication. On approval, verify the actual anonymous hosted origin, assets, headers and a fresh OCR workflow before submitting its URL.
