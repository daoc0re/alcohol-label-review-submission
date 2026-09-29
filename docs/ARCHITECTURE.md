# Architecture decisions and tradeoffs

## 1. Static browser-local inference

The workload is reading images and comparing declarations, without a need for a shared database. Running a pretrained OCR engine in a worker avoids sending artwork to a cloud model and keeps the UI responsive. Deployments need only static HTTP(S), including worker, WebAssembly and compressed language assets. Installation/build may use the package registry; review runtime uses the application's origin only. A downloaded prebuilt release can run on localhost without outbound Internet access.

A cloud multimodal model might interpret stylized labels better but adds credentials, cost, egress restrictions, privacy/retention decisions, latency, and less deterministic behavior. A Python OCR server centralizes device requirements but transmits files and creates an upload-processing service to secure and operate. Neither is necessary for this scope. No claim is made that Tesseract is the most accurate model on an unevaluated real-world corpus.

## 2. Recognition and extraction before comparison

`OcrService` recognizes image text with no expected application values. `extractCandidates(panels)` uses only OCR lines, confidence, and geometry. `compareApplication` joins the independently derived observations with expectations. This prevents the expected answer from guiding the extraction into a false agreement. It does not eliminate recognition/selection error.

Candidate rules recognize class/type keywords, common business role phrases, origin prefixes, unit-marked quantities, and prominent early brand text. This is inspectable, fast, and intentionally limited. Names containing category keywords, digits, unsupported classes, split brand text, business statements broken across distant regions, or decorative lines can confuse it. The original evidence is always available; a next iteration should improve region detection and evaluate it against annotations rather than silently loosen matching.

## 3. Explicit uncertainty

Absent evidence is Unable to Verify, not a missing-label violation. Weak OCR or multiple candidates is Manual Review. A confidently recognized difference is Mismatch but still prompts artwork inspection. Match establishes only the chosen text comparison. There is no combined compliance score and no approved/rejected state.

The minimum line/word confidence gates (80/55) are heuristic. They avoid treating visible uncertainty as certainty but do not guarantee high precision. Calibration and field-specific error measurement require a representative corpus that was not available for this exercise.

## 4. Separate warning policy

Ordinary name normalization must never leak into the prescribed warning rule. The warning comparison retains wording, punctuation and numbered clauses, collapses layout whitespace, allows body capitalization, and requires the uppercase heading. Typography is a separate permanently open manual finding: OCR does not establish boldness, true millimeters, contrast, or affixation. Conflicting warnings across panels require review.

## 5. Bounded work and lifecycle

Image headers and decoded sizes are validated. Rasterization removes metadata from the prepared PNG, fills transparency white, and downsizes the long edge to 2,200 pixels. These bounds trade tiny-text accuracy for memory/latency; the reviewer is told when downsizing occurs. Original encoded size is limited to 10 MB and decoded size to 20 MP before preparation. Header parsing does not make all decoding risk disappear.

One worker is reused and a generation counter prevents a cancelled initialization from becoming the active worker later. Cancellation aborts the task and terminates the worker; results are checked against cancellation and session generation before display. Failures dispose of the worker so a subsequent attempt can initialize again. A per-panel timeout limits stalled OCR. Object URLs are revoked on removal, clearing and teardown.

Batch entries snapshot both application details and cloned object URLs; later form edits do not mutate queued jobs. Jobs run sequentially, with independent failure states. Prepared artwork is bounded by 50 MB and ten jobs. There is no durable queue or multi-user coordination. All state vanishes on reload/clear.

## 6. Accessibility and privacy

React renders untrusted text as text. Meaningful labels, live alerts, status text/icons, evidence transcripts, focus movement and responsive layout support a broad audience. Native/established UI primitives provide interaction semantics. Browser audit tools aid verification but cannot certify Section 508 compliance.

No submitted review is stored by the app. Tesseract cache is disabled. Browser HTTP caching of public model files is distinct from storing user artwork. Host request logs, browser/device memory, extensions and user screenshots remain outside the prototype's control. A production deployment needs explicit governance rather than stronger privacy marketing claims.

## 7. Production priorities

1. Independently labeled real artwork, including challenging photos; field-level precision/recall and false-match analysis; target-device cold/warm p50/p95 latency.
2. Human correction/adjudication and audit trails, with a versioned policy signed off by labeling specialists.
3. Reliable region segmentation, broader supported classes/layouts/languages, and carefully justified preprocessing.
4. Screen-reader/user studies and formal accessibility review.
5. Threat model, dependency security review, approved hosting, authentication/authorization, retention, incident response and agency authorization decisions.
6. Scalable batches and only then integration with COLA under the appropriate requirements/authority.

A small synthetic test set and a working public prototype would not satisfy these production gates.
