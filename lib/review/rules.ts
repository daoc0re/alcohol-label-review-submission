import type {
  Application,
  Candidate,
  Field,
  OcrLine,
  OcrPanel,
  Result,
  Status,
} from "./types";
export const WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";
export const RULES_VERSION = "2026-09-23.1";
export const WARNING_REF =
  "https://www.ecfr.gov/current/title-27/chapter-I/subchapter-A/part-16";
const MIN_LINE = 80,
  MIN_WORD = 55;
const classPattern =
  /\b(whisk(?:e)?y|bourbon|vodka|gin|rum|tequila|brandy|liqueur|mezcal|cognac|wine|chardonnay|cabernet|merlot|riesling|pinot|sauvignon|lager|ale|beer|stout|porter|pilsner|ipa|sake)\b/i;
const rolePattern =
  /\b(?:bottled|distilled|produced|brewed|blended|made|packed|canned|imported|vinted)(?:\s+and\s+(?:bottled|distilled|produced|brewed))?\s+(?:by|for)\b/i;
const originPattern =
  /\b(?:product of|produced in|made in|country of origin\s*:?)\s+(.+)/i;
/** Ordinary names only. Preserve accents and token boundaries; never fuzzy-approve. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[’‘'`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
export function normalizeWarning(value: string): string {
  return value.replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
}
export function parseVolume(
  value: string,
): { value: number; unit: string } | null {
  const m = value
    .trim()
    .match(
      /^(\d+(?:\.\d+)?|\.\d+)\s*(ml\.?|millilit(?:er|re)s?|cl\.?|centilit(?:er|re)s?|l\.?|lit(?:er|re)s?|fl\.?\s*oz\.?|fluid ounces?)$/i,
    );
  if (!m || !Number.isFinite(Number(m[1])) || Number(m[1]) <= 0) return null;
  const unit = m[2].toLowerCase();
  if (/^(fl|fluid)/.test(unit))
    return { value: Number(m[1]), unit: "US fl oz" };
  return {
    value:
      Number(m[1]) *
      (/^(ml|milli)/.test(unit) ? 1 : /^(cl|centi)/.test(unit) ? 10 : 1000),
    unit: "mL",
  };
}
export function validateApplication(a: Application): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [key, label] of [
    ["brand", "Brand name"],
    ["classType", "Class or type"],
    ["netContents", "Net contents"],
    ["business", "Business statement"],
  ] as const) {
    if (!a[key]?.trim()) errors[key] = `${label} is required.`;
    else if (a[key].length > 400)
      errors[key] = `${label} must be 400 characters or fewer.`;
  }
  if (!["spirits", "wine", "malt"].includes(a.beverage))
    errors.beverage = "Choose a beverage category.";
  if (a.reference.length > 80)
    errors.reference = "Reference must be 80 characters or fewer.";
  if (a.beverage !== "malt" && !a.abv.trim())
    errors.abv =
      "Enter the expected alcohol percentage to establish the review context.";
  if (
    a.abv.trim() &&
    (!/^(\d+(?:\.\d+)?|\.\d+)$/.test(a.abv.trim()) ||
      Number(a.abv) < 0 ||
      Number(a.abv) > 100)
  )
    errors.abv = "Enter a number from 0 to 100, without the percent sign.";
  if (a.netContents && !parseVolume(a.netContents))
    errors.netContents =
      "Use a positive volume, such as 750 mL, 0.75 L, or 12 fl oz.";
  if (a.imported && !a.origin.trim())
    errors.origin = "Enter the imported product’s country of origin.";
  if (a.origin.length > 100)
    errors.origin = "Country of origin must be 100 characters or fewer.";
  return errors;
}
function candidate(
  lines: OcrLine[],
  text = lines.map((l) => l.text).join(" "),
): Candidate {
  return { text: text.trim(), lines };
}
function reliable(c: Candidate): boolean {
  return (
    c.lines.length > 0 &&
    c.lines.every(
      (l) => l.confidence >= MIN_LINE && l.minWordConfidence >= MIN_WORD,
    )
  );
}
function unique(cs: Candidate[]): Candidate[] {
  return cs.filter(
    (c, i) =>
      cs.findIndex((x) => normalizeText(x.text) === normalizeText(c.text)) ===
      i,
  );
}
/** Independent field proposals: expected application values never enter this function. */
export function extractCandidates(panels: OcrPanel[]) {
  const brands: Candidate[] = [],
    classes: Candidate[] = [],
    business: Candidate[] = [],
    origins: Candidate[] = [],
    abvs: Candidate[] = [],
    volumes: Candidate[] = [],
    proofs: Candidate[] = [];
  for (const panel of panels) {
    // Remove warning lines, not every line after a warning: fields may appear below it.
    let inWarning = false;
    const lines = panel.lines.filter((l) => {
      if (/government\s+warning|surgeon general/i.test(l.text))
        inWarning = true;
      if (inWarning) {
        if (/health\s+problems/i.test(l.text)) inWarning = false;
        return false;
      }
      return true;
    });
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i],
        t = l.text;
      if (
        classPattern.test(t) &&
        !rolePattern.test(t) &&
        !/^(brand|synthetic|sample)\b/i.test(t)
      ) {
        const prev = lines[i - 1];
        const block =
          prev &&
          /^(kentucky|straight|kentucky straight|single malt|london dry|red|white|sparkling|dry|irish|blended)$/i.test(
            prev.text.trim(),
          )
            ? [prev, l]
            : [l];
        classes.push(
          candidate(
            block,
            block
              .map((x) => x.text)
              .join(" ")
              .replace(/^(?:class\s*\/\s*type|class|type)\s*:\s*/i, ""),
          ),
        );
      }
      if (rolePattern.test(t)) {
        const block = [l];
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const next = lines[j];
          if (
            rolePattern.test(next.text) ||
            originPattern.test(next.text) ||
            /%|proof|\b(?:mL|liters?|fl\.?\s*oz)\b|synthetic/i.test(
              next.text,
            ) ||
            classPattern.test(next.text)
          )
            break;
          if (
            next.box.y0 - block[block.length - 1].box.y1 >
            Math.max(70, (l.box.y1 - l.box.y0) * 3)
          )
            break;
          block.push(next);
        }
        business.push(candidate(block));
      }
      const origin = t.match(originPattern);
      if (origin) origins.push(candidate([l], origin[1]));
      // Require alcohol/volume markers so unrelated percentages are not treated as ABV.
      if (
        /\b(?:alc\.?|alcohol|abv)\b/i.test(t) &&
        /\b(?:vol\.?|volume|abv)\b/i.test(t)
      ) {
        for (const m of t.matchAll(
          /(?<![\d.,])((?:\d+(?:\.\d+)?|\.\d+))\s*(?:%|percent\b)/gi,
        )) {
          abvs.push({
            ...candidate([l]),
            value: Number(m[1]),
            unit: "%",
            ambiguous:
              /\d\s*(?:%|percent)?\s*(?:to|[-–—])\s*\d|less than|more than|at least|at most|under|over|[<>≤≥]/i.test(
                t,
              )
                ? "An alcohol range or qualified value requires manual review; a bound must not be treated as an exact declared value."
                : undefined,
          });
        }
      }
      for (const m of t.matchAll(
        /(?<![\d.,])((?:\d+(?:\.\d+)?|\.\d+))\s*proof\b/gi,
      ))
        proofs.push({ ...candidate([l]), value: Number(m[1]) });
      for (const m of t.matchAll(
        /(?<![\d.,])((?:\d+(?:\.\d+)?|\.\d+))\s*(millilit(?:er|re)s?|centilit(?:er|re)s?|lit(?:er|re)s?|ml\.?|cl\.?|l\.?|fl\.?\s*oz\.?|fluid ounces?)\b/gi,
      )) {
        const parsed = parseVolume(m[0]);
        if (parsed) volumes.push({ ...candidate([l], m[0]), ...parsed });
      }
    }
    const explicit = lines.filter((l) => /^brand(?: name)?\s*:/i.test(l.text));
    if (explicit.length)
      brands.push(
        ...explicit.map((l) =>
          candidate([l], l.text.replace(/^brand(?: name)?\s*:\s*/i, "")),
        ),
      );
    else {
      const choices = lines
        .slice(0, 8)
        .filter(
          (l) =>
            l.text.trim().length > 2 &&
            !business.some((c) => c.lines.includes(l)) &&
            !classPattern.test(l.text) &&
            !rolePattern.test(l.text) &&
            !originPattern.test(l.text) &&
            !/%|proof|\b(?:mL|fl\.?\s*oz)\b|synthetic|sample|not for sale|est\.|since|small batch|handcrafted/i.test(
              l.text,
            ) &&
            !/\d/.test(l.text),
        );
      choices.sort((a, b) => b.box.y1 - b.box.y0 - (a.box.y1 - a.box.y0));
      if (choices[0]) brands.push(candidate([choices[0]]));
    }
  }
  return {
    brand: brands,
    classType: classes,
    business,
    origin: origins,
    abv: abvs,
    netContents: volumes,
    proofs,
  };
}
function result(
  field: Field,
  label: string,
  status: Status,
  expected: string,
  observed: string,
  reason: string,
  evidence: OcrLine[] = [],
): Result {
  return { field, label, status, expected, observed, reason, evidence };
}
function compareText(
  field: Field,
  label: string,
  expected: string,
  cs: Candidate[],
): Result {
  if (!cs.length)
    return result(
      field,
      label,
      "Unable to Verify",
      expected,
      "No recognizable candidate located",
      "OCR did not locate a recognizable field. This does not prove the information is absent; inspect every label panel.",
    );
  const evidence = cs.flatMap((c) => c.lines);
  if (unique(cs).length > 1)
    return result(
      field,
      label,
      "Manual Review",
      expected,
      unique(cs)
        .map((c) => c.text)
        .join(" | "),
      "Multiple distinct candidates were found. Confirm which statement applies to this field.",
      evidence,
    );
  const c = cs[0];
  if (!cs.every(reliable))
    return result(
      field,
      label,
      "Manual Review",
      expected,
      c.text,
      "Low-confidence OCR affects this evidence. Read the artwork before deciding whether it agrees.",
      evidence,
    );
  const match = normalizeText(expected) === normalizeText(c.text);
  return result(
    field,
    label,
    match ? "Match" : "Mismatch",
    expected,
    c.text,
    match
      ? "The candidate agrees after normalizing case, spacing, ordinary punctuation, apostrophes, and &/and. This is a text comparison only."
      : "The candidate differs beyond allowed normalization. Inspect the image; OCR or field selection may be wrong.",
    evidence,
  );
}
function compareNumber(
  field: "abv" | "netContents",
  label: string,
  expected: string,
  cs: Candidate[],
): Result {
  const ambiguous = cs.find((c) => c.ambiguous);
  if (ambiguous)
    return result(
      field,
      label,
      "Manual Review",
      expected,
      ambiguous.text,
      ambiguous.ambiguous!,
      ambiguous.lines,
    );
  const target =
    field === "abv"
      ? { value: Number(expected), unit: "%" }
      : parseVolume(expected)!;
  if (!cs.length)
    return result(
      field,
      label,
      "Unable to Verify",
      expected,
      "No recognizable numeric statement",
      "No supported statement was recognized. Inspect the artwork; absence in OCR is not proof of a missing label statement.",
    );
  const distinct = cs.filter(
      (c, i) =>
        cs.findIndex((x) => x.unit === c.unit && x.value === c.value) === i,
    ),
    evidence = cs.flatMap((c) => c.lines);
  if (distinct.length > 1)
    return result(
      field,
      label,
      "Manual Review",
      expected,
      distinct.map((c) => c.text).join(" | "),
      "Multiple quantities, units, or a range were found. Inspect the applicable statements.",
      evidence,
    );
  const c = distinct[0];
  if (!cs.every(reliable))
    return result(
      field,
      label,
      "Manual Review",
      expected,
      c.text,
      "OCR uncertainty affects a numeric statement. Do not silently repair or infer a digit.",
      evidence,
    );
  if (c.unit !== target.unit)
    return result(
      field,
      label,
      "Manual Review",
      expected,
      c.text,
      "Different measurement systems require review. Metric units are converted; rounded US/metric equivalents are not assumed exact.",
      evidence,
    );
  const match = Math.abs(c.value! - target.value) < 0.000001;
  return result(
    field,
    label,
    match ? "Match" : "Mismatch",
    expected,
    c.text,
    match
      ? "Numeric values agree after supported unit normalization. This does not validate legal format, fill standards, or actual beverage content."
      : "The label value differs from the application value. Manufacturing tolerances do not excuse differences between these two statements.",
    evidence,
  );
}
export function checkWarning(panels: OcrPanel[]): Result {
  const warnings: Candidate[] = [];
  for (const panel of panels) {
    const headings = panel.lines
      .map((l, i) => (/government\s+warning/i.test(l.text) ? i : -1))
      .filter((i) => i >= 0);
    const fallback = panel.lines.findIndex((l) =>
      /surgeon general/i.test(l.text),
    );
    const starts = headings.length ? headings : fallback >= 0 ? [fallback] : [];
    for (const start of starts) {
      const lines: OcrLine[] = [];
      for (const l of panel.lines.slice(start)) {
        lines.push(l);
        if (/health\s+problems\s*\.?/i.test(l.text)) break;
      }
      const joined = lines.map((l) => l.text).join(" "),
        end = joined.match(/health\s+problems\./i);
      warnings.push(
        candidate(
          lines,
          end?.index !== undefined
            ? joined.slice(0, end.index + end[0].length)
            : joined,
        ),
      );
    }
  }
  let r: Result;
  if (!warnings.length)
    r = result(
      "warning",
      "Government warning · text",
      "Unable to Verify",
      WARNING,
      "Warning not located in OCR",
      "Inspect all panels or provide clearer artwork; do not infer absence from OCR alone.",
    );
  else if (new Set(warnings.map((w) => normalizeWarning(w.text))).size > 1)
    r = result(
      "warning",
      "Government warning · text",
      "Manual Review",
      WARNING,
      warnings.map((c) => c.text).join(" | "),
      "Different warning candidates were found. Inspect every version.",
      warnings.flatMap((c) => c.lines),
    );
  else {
    const c = warnings[0],
      normalized = normalizeWarning(c.text),
      header = /^GOVERNMENT WARNING:/.test(normalized);
    // Body capitalization is not prescribed. Every word, mark and numeral is retained.
    const exact = normalized.toLowerCase() === WARNING.toLowerCase(),
      trusted = warnings.every(reliable);
    r = result(
      "warning",
      "Government warning · text",
      !trusted ? "Manual Review" : exact && header ? "Match" : "Mismatch",
      WARNING,
      c.text,
      !trusted
        ? "OCR uncertainty affects the warning. No automatic confirmation is issued, even if recognized wording looks correct."
        : !header
          ? "The recognized heading is not exactly GOVERNMENT WARNING: in uppercase with its colon. Verify the original artwork."
          : !exact
            ? "Recognized wording, numbering, or punctuation differs from the prescribed warning. Only layout whitespace and body capitalization are ignored. Inspect the original before acting."
            : "Prescribed wording, numbering, punctuation, and uppercase heading agree in OCR. Boldness, size, separation, and legibility still require visual review.",
      warnings.flatMap((c) => c.lines),
    );
  }
  r.reference = WARNING_REF;
  return r;
}
export function compareApplication(
  a: Application,
  panels: OcrPanel[],
): Result[] {
  if (Object.keys(validateApplication(a)).length)
    throw new Error("Application information is invalid.");
  const c = extractCandidates(panels),
    results = [
      compareText("brand", "Brand name", a.brand, c.brand),
      compareText("classType", "Class / type", a.classType, c.classType),
    ];
  if (a.abv.trim()) {
    const r = compareNumber("abv", "Alcohol content", a.abv, c.abv);
    r.expected = a.abv + "%";
    if (
      c.proofs.some((p) => p.value !== Number(a.abv) * 2 || !reliable(p)) &&
      r.status === "Match"
    ) {
      r.status = "Manual Review";
      r.reason =
        "The percentage agrees, but a proof statement is inconsistent or uncertain. Verify percentage and proof together.";
      r.evidence.push(...c.proofs.flatMap((p) => p.lines));
    }
    if (
      !c.abv.length &&
      a.beverage === "wine" &&
      Number(a.abv) >= 7 &&
      Number(a.abv) <= 14 &&
      /\b(table|light) wine\b/i.test(a.classType)
    ) {
      r.status = "Manual Review";
      r.reason =
        "A numerical statement may be omitted for qualifying table/light wine at 7–14%. Verify designation and eligibility. The expected percentage cannot be verified from this artwork.";
    }
    results.push(r);
  } else
    results.push(
      result(
        "abv",
        "Alcohol content",
        "Manual Review",
        "Not supplied",
        c.abv.map((x) => x.text).join(" | ") || "Not located",
        "Malt beverage alcohol-content requirements depend on formulation and other rules. Establish applicability; no automatic match is issued.",
      ),
    );
  results.push(
    compareNumber("netContents", "Net contents", a.netContents, c.netContents),
  );
  results.push(
    compareText(
      "business",
      a.imported
        ? "Importer / business statement"
        : "Bottler / producer statement",
      a.business,
      c.business,
    ),
  );
  if (a.imported)
    results.push(
      compareText("origin", "Country of origin", a.origin, c.origin),
    );
  if (a.abv.trim() && Number(a.abv) < 0.5)
    results.push(
      result(
        "warning",
        "Government warning · text",
        "Manual Review",
        "Applicability review",
        "Expected alcohol is below 0.5%",
        "Part 16 defines alcoholic beverages at 0.5% or more. Confirm classification and applicable rules before deciding whether a warning is required.",
      ),
    );
  else results.push(checkWarning(panels));
  results.push({
    ...result(
      "presentation",
      "Typography & placement",
      "Manual Review",
      "Human inspection required",
      "Not determined by text recognition",
      "Confirm the heading is uppercase and bold, the body is not bold, contrast and separation are adequate, and printed type size meets the container-size rule. Check required field placement. Pixels alone do not establish millimeters.",
    ),
    reference: WARNING_REF,
  });
  results.push(
    result(
      "category",
      "Beverage-specific requirements",
      "Manual Review",
      a.beverage === "spirits"
        ? "Distilled spirits"
        : a.beverage === "wine"
          ? "Wine"
          : "Malt beverage",
      "Outside automated comparison scope",
      "Confirm legal class/type, alcohol statement format, net-content format and standards, ingredient disclosures, and applicable origin/age/appellation requirements. These comparisons do not establish full label compliance.",
    ),
  );
  return results;
}
