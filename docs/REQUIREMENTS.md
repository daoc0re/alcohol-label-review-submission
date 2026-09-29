# Requirements traceability and evaluation review

Basis: applicant-supplied complete Treasury assessment README. The official GitHub address could not be retrieved. Explicit implementation constraints from the applicant take precedence over optional scope suggestions. Stakeholder anecdotes are context, not authoritative regulatory text.

| ID | Classification | Need / concern | Implementation and evidence | Boundary |
|---|---|---|---|---|
| R01 | Required | Reviewer provides expected details | Typed form; `validateApplication`; invalid-field browser test | ABV required as context for wine/spirits; optional for malt |
| R02 | Required | Accept and extract label artwork | File API → raster preparation → actual Tesseract worker; OCR integration report | English PNG/JPEG/still WebP; 4 panels |
| R03 | Required | Compare brand and class/type | Independent candidates; normalization; evidence highlights | Layout/class vocabulary heuristic |
| R04 | Required | Alcohol and net contents | Contextual numeric extraction, exact values, metric conversions, proof cross-check | No manufacturing tolerance, fill-standard approval, or silent digit repair |
| R05 | Required | Business name/address; import origin | Full expected business statement; origin when imported | Aliases and disjoint/multiple statements need human review |
| R06 | Required | Harmless formatting differences | Ordinary case/space/punctuation normalization; Stone's Throw test | No fuzzy approval; accents retained |
| R07 | Required | Prescribed warning text | Separate exact wording/marks/header rule; changed word and heading tests | Body case/layout spaces ignored; low OCR confidence escalates |
| R08 | Required | Legally visual warning requirements | Always-visible Manual Review finding and official reference | Boldness/physical size/contrast not inferred from OCR |
| R09 | Required | Understandable, explainable decisions | Four labeled statuses; expected/observed/reason; original image and raw OCR | Match is comparison only, never approval |
| R10 | Required | Straightforward interface for varied tech comfort | Three numbered steps, examples, large primary action, keyboard labels/focus | No COLA/account setup |
| R11 | Required | Approximately five-second expectation | Same-origin model; reused worker; downscaling; elapsed time; benchmark; cancellation/timeout | Target, not SLA; cold download and hardware variability |
| R12 | Required | Unreadable/unsupported input safety | Signature/size/dimension checks; type/decode errors; empty-OCR error | Severe glare/blur/perspective not repaired |
| R13 | Required | Privacy/restricted egress | No review persistence or backend upload; self-hosted OCR assets | Initial installation needs registry; runtime needs own origin |
| R14 | Required | Code, README, approach/tools/assumptions | Complete source package, locked install, README, architecture/regulatory/security/verification docs | Public repository approval pending |
| R15 | Required deliverable | Deployed reviewer-accessible prototype | Built static output and local dependency-free server prepared | Public deployment approval pending; anonymous access must be checked |
| R16 | Required user constraint | Responsible AI and no proprietary material | AI disclosure; synthetic data; no employer/trading/personal code | Applicant must understand and review before submission |
| A01 | Assumption | Conditional category rules | Explicit applicability/manual checks for low ABV, wine and malt exceptions | Does not automate comprehensive legal determination |
| A02 | Assumption | Multiple artwork panels | Treat 1–4 panels as one application, with per-panel evidence | Reviewer verifies panel association |
| A03 | Assumption | Application-label comparison, not chemical testing | Exact numeric declaration comparison | No actual beverage-content validation |
| S01 | Stretch delivered | Batch processing | 10-job sequential in-memory queue; own details/artwork, failure isolation, cancel/retry | No 200–300-job persistence or bulk manifest import |
| S02 | Stretch partially delivered | Imperfect photographs | Manual rotation, white background, bounded resizing, uncertainty/error | No automatic dewarping or glare removal |
| O01 | Out of scope | Production COLA integration | Standalone static prototype | No integration/auth/agency data |
| O02 | Out of scope | Production governance and retention | Documented future design questions | No FedRAMP/ATO/Section 508 certification claim |
| O03 | Out of scope | Automated regulatory approval | Human review boundary throughout UI/docs | No overall approved/rejected result |

## Evaluation criteria review

| Criterion | Assessment with evidence | Honest limitation |
|---|---|---|
| Correctness/completeness | Core single-review inputs, OCR, all requested fields, outcomes and evidence implemented; deterministic and actual-OCR checks | Final public deliverables pending authorization; OCR heuristics remain fallible |
| Code quality/organization | Typed domain models; separated preparation/OCR/rules/UI; reproducible lockfile; tests and release scripts | Starter catalog/development dependencies retained; not an independently minimized dependency tree |
| Technical choices | Static browser-local design answers firewall/privacy constraints; no credential or paid API | Local inference is device dependent; no broad model benchmark |
| UX/error handling | Obvious steps/examples, focus/status, actionable image errors, progress/cancel and batch isolation | Formal assistive-technology/usability study outstanding |
| Attention to requirements | Traceability, strict warning handling, physical-measurement boundary, qualified numeric values, benchmark scope | Does not mistake stakeholder shorthand for complete law |
| Creative problem-solving | Local OCR plus evidence coordinates; independent extraction avoids answer leakage; bounded independent batch snapshots | Full import batch capability deliberately deferred |

No requirement is silently marked complete if it depends on publication, real-label validation, or production authorization.
