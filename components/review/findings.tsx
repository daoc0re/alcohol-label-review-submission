import { Check, X, Eye, HelpCircle, Clock } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  STATUS_ORDER,
  type Status,
  type Review,
  type Result,
} from "@/lib/review/types";
import { RULES_VERSION } from "@/lib/review/rules";
export const statusClass = (s: Status) =>
  s === "Match"
    ? "match"
    : s === "Mismatch"
      ? "mismatch"
      : s === "Manual Review"
        ? "manual"
        : "unable";
export function StatusIcon({ status }: { status: Status }) {
  return status === "Match" ? (
    <Check aria-hidden="true" />
  ) : status === "Mismatch" ? (
    <X aria-hidden="true" />
  ) : status === "Manual Review" ? (
    <Eye aria-hidden="true" />
  ) : (
    <HelpCircle aria-hidden="true" />
  );
}
export function Findings({
  review,
  onEvidence,
}: {
  review: Review | null;
  onEvidence: (r: Result) => void;
}) {
  return (
    <section
      className={"results-section " + (!review ? "results-empty" : "")}
      aria-labelledby="results-heading"
    >
      <div className="results-heading">
        <span className="section-number">03</span>
        <div>
          <h2 tabIndex={-1} id="results-heading">
            {review ? "Review the findings" : "Comparison findings"}
          </h2>
          <p>
            {review
              ? `${review.application.reference ? review.application.reference + " · " : ""}${review.application.brand}`
              : "Complete the first two steps, then select Compare label."}
          </p>
        </div>
        {review && (
          <span className="elapsed">
            <Clock aria-hidden="true" />
            {review.seconds.toFixed(1)}s total
          </span>
        )}
      </div>
      {review && (
        <>
          <div className="result-counts">
            {STATUS_ORDER.map((status) => (
              <div className={"count " + statusClass(status)} key={status}>
                <StatusIcon status={status} />
                <strong>
                  {review.results.filter((r) => r.status === status).length}
                </strong>
                <span>{status}</span>
              </div>
            ))}
          </div>
          <p className="review-instruction">
            Expand a finding to compare expected and extracted text. A match
            confirms the text comparison only; manual checks remain open.
          </p>
          <Accordion type="multiple" className="findings">
            {review.results.map((r) => (
              <AccordionItem key={r.field} value={r.field} className="finding">
                <AccordionTrigger className="finding-trigger">
                  <span className="finding-name">{r.label}</span>
                  <span className={"status-badge " + statusClass(r.status)}>
                    <StatusIcon status={r.status} />
                    {r.status}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="finding-body">
                    <div className="comparison-text">
                      <div>
                        <h3>Expected</h3>
                        <p>{r.expected}</p>
                      </div>
                      <div>
                        <h3>Extracted / observed</h3>
                        <p>{r.observed}</p>
                      </div>
                    </div>
                    <p className="reason">{r.reason}</p>
                    <div className="finding-actions">
                      <button
                        type="button"
                        className="inline-button"
                        onClick={() => onEvidence(r)}
                      >
                        <Eye aria-hidden="true" />
                        {r.evidence.length
                          ? "Show image evidence"
                          : "Inspect artwork"}
                      </button>
                      {r.evidence.length > 0 && (
                        <span className="confidence">
                          OCR line confidence:{" "}
                          {Math.round(
                            Math.min(...r.evidence.map((l) => l.confidence)),
                          )}
                          –
                          {Math.round(
                            Math.max(...r.evidence.map((l) => l.confidence)),
                          )}{" "}
                          / 100 · not a probability of correctness
                        </span>
                      )}
                      {r.reference && (
                        <a href={r.reference} target="_blank" rel="noreferrer">
                          Official rule ↗
                        </a>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <Accordion type="multiple" className="raw-ocr">
            <AccordionItem value="ocr">
              <AccordionTrigger>
                Extracted text & processing details
              </AccordionTrigger>
              <AccordionContent>
                <p>
                  Unedited OCR. Field extraction is heuristic and can be wrong.
                  Rules version {RULES_VERSION}.
                </p>
                {review.panels.map((p, i) => (
                  <section className="ocr-panel" key={i}>
                    <h3>
                      Panel {i + 1}: {p.name}
                    </h3>
                    <p>
                      {p.seconds.toFixed(2)}s · OCR confidence{" "}
                      {Math.round(p.confidence)} / 100
                    </p>
                    {p.qualityNotes.map((n) => (
                      <p key={n}>{n}</p>
                    ))}
                    <pre>{p.text}</pre>
                  </section>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </>
      )}
    </section>
  );
}
