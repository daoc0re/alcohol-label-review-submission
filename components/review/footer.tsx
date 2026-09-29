import { ShieldCheck } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { WARNING, WARNING_REF } from "@/lib/review/rules";
export function ReviewFooter() {
  return (
    <footer>
      <div>
        <ShieldCheck aria-hidden="true" />
        <p>
          <strong>Private by design.</strong> Images and extracted text are
          processed in memory on this page. No uploads, analytics, or saved
          review history. Clear the session when finished.
        </p>
      </div>
      <Accordion type="multiple" className="footer-details">
        <AccordionItem value="scope">
          <AccordionTrigger>
            Review scope, privacy & official references
          </AccordionTrigger>
          <AccordionContent>
            <p>
              This independent assessment prototype compares selected fields. It
              does not issue a COLA, approve or reject a product, establish
              Section 508 conformance, or replace a trained reviewer. Use public
              or synthetic artwork only.
            </p>
            <p>
              The application and OCR assets load from the same site. Artwork
              and expected details are not transmitted. The host may log
              ordinary page/asset requests. Browser asset caches contain
              application files, not submitted reviews. Extensions and
              device-memory behavior are outside this application’s control.
            </p>
            <p>
              English OCR works best on clear, flat artwork. Glare, curved
              bottles, unusual fonts, split brand lines, complex layouts, and
              poor photos can cause recognition or field-selection errors.
              Inspect every result, including matches.
            </p>
            <p>
              Review heading boldness, non-bold warning body, contrast,
              separation, and physical size: at most 237 mL requires at least 1
              mm; over 237 mL through 3 L requires 2 mm; over 3 L requires 3 mm.
              Do not infer physical scale from pixels. Check character density
              and required field placement too.
            </p>
            <p className="prescribed-warning">
              <strong>Prescribed warning text</strong>
              <br />
              {WARNING}
            </p>
            <ul>
              <li>
                <a href={WARNING_REF} target="_blank" rel="noreferrer">
                  27 CFR Part 16 · Health warning
                </a>
              </li>
              <li>
                <a
                  href="https://www.ecfr.gov/current/title-27/chapter-I/subchapter-A/part-5/subpart-E"
                  target="_blank"
                  rel="noreferrer"
                >
                  27 CFR Part 5, Subpart E · Distilled spirits
                </a>
              </li>
              <li>
                <a
                  href="https://www.ttb.gov/regulated-commodities/beverage-alcohol/wine/wine-labeling-alcohol-content"
                  target="_blank"
                  rel="noreferrer"
                >
                  TTB · Wine alcohol content
                </a>
              </li>
              <li>
                <a
                  href="https://www.ttb.gov/regulated-commodities/beverage-alcohol/beer/labeling"
                  target="_blank"
                  rel="noreferrer"
                >
                  TTB · Malt beverage labeling
                </a>
              </li>
            </ul>
            <p>
              Rules reviewed September 23, 2026. See the source README for
              technical decisions, tests, and limitations.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <span className="footer-meta">
        Independent prototype · Human review required
      </span>
    </footer>
  );
}
