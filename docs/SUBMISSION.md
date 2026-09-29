# Review and submission guide

## Current state

The owner approved publication. The prototype is deployed publicly at [Alcohol Label Review](https://alcohol-label-review.alexander-d-dao.chatgpt.site), and the [source repository](https://github.com/daoc0re/alcohol-label-review-submission) is public. The assessment form has not been submitted.

| Deliverable | Status |
|---|---|
| Complete source and README | Included in the release package; local Git history records the prepared release |
| Working application | Built static application included; runs with `node scripts/serve.mjs` |
| Public source repository URL | [https://github.com/daoc0re/alcohol-label-review-submission](https://github.com/daoc0re/alcohol-label-review-submission) |
| Deployed application URL | [https://alcohol-label-review.alexander-d-dao.chatgpt.site](https://alcohol-label-review.alexander-d-dao.chatgpt.site); Site access mode is public |
| Assessment form | Not submitted |

## Five-minute review walkthrough

1. Start the included build and load **Old Tom · matching text**. Compare; six text fields should Match while typography/category checks remain Manual Review. Expand brand and show its evidence.
2. Load **Old Tom · discrepancies**. Compare; alcohol and warning text should disagree. Read the actual extracted values.
3. Load **Stone’s Throw · capitalization**. Compare both panels. Case and apostrophe differences should not become false mismatches.
4. Load **Old Tom · conflicting percentages**. Both percentages must cause Manual Review.
5. Load the blank or blurred example. Expect an actionable unreadable-image error, not a fabricated result.
6. Add two distinct applications to the queue. Edit the live form and verify the queued snapshot remains independent. Run and open each result.
7. Clear the session. Verify application fields, artwork, results, and queue disappear.

## Technical discussion: decisions to understand

- **Why AI?** A pretrained neural OCR model converts pixels into evidence. No LLM is needed for deterministic field comparison.
- **Why local?** Avoid external inference endpoints, credentials and review-data transmission; support restricted networks with self-hosted assets.
- **Why separate extraction and comparison?** Expected answers cannot bias candidate selection into invented matches.
- **Why manual checks on a matching label?** OCR cannot determine print scale or prove boldness, finished-container placement, or product-specific legal eligibility.
- **What does confidence mean?** A model-derived heuristic, not a calibrated probability; high-confidence errors remain possible.
- **What is the five-second evidence?** A measured synthetic result in a specific environment. It is not an SLA or a real-world benchmark.
- **Why only ten batch jobs?** Reliable session-local processing and bounded memory; large durable batches need a different governed architecture.
- **How was AI assistance used?** Disclose Codex assistance across implementation, research, tests and documentation; demonstrate understanding of each decision and its limitations.

## Remaining submission steps

1. Check the deployed URL from a clean unauthenticated browser, including an OCR comparison, and confirm model loading and same-origin asset paths on the actual host.
2. Owner checks the assessment deadline/status, reviews final limitations and AI disclosure, then separately authorizes or performs form submission.

## Checklist

- [x] Source code, locked installation, setup/run/test instructions
- [x] Expected application details and real OCR workflow
- [x] Selected field comparisons with evidence and uncertainty
- [x] Synthetic positive/negative/ambiguous/error fixtures
- [x] Privacy/security/accessibility scope and honest limitations
- [x] Requirements/evaluation mapping and architecture decisions
- [x] Official references and AI assistance disclosure
- [x] Owner approves publication
- [x] Dedicated public source repository created
- [x] Public deployed application created with public access mode
- [ ] Deployment smoke checks and final URLs recorded
- [ ] Applicant can explain the implementation in their own words
- [ ] Assessment submitted only after separate authorization
