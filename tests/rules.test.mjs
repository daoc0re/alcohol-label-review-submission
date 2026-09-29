import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WARNING,
  normalizeText,
  parseVolume,
  validateApplication,
  extractCandidates,
  compareApplication,
  checkWarning,
} from "../.test-build/rules.mjs";
import { SAMPLES } from "../.test-build/samples.mjs";
const app = SAMPLES[0].application;
function panel(
  texts,
  { confidence = 96, minWordConfidence = 95, index = 0 } = {},
) {
  return {
    name: "synthetic",
    text: texts.join("\n"),
    confidence,
    width: 1500,
    height: 1200,
    seconds: 0,
    qualityNotes: [],
    lines: texts.map((text, i) => ({
      text,
      confidence,
      minWordConfidence,
      panel: index,
      box: { x0: 50, y0: i * 100, x1: 1400, y1: i * 100 + 40 },
    })),
  };
}
const lines = [
  "OLD TOM DISTILLERY",
  "Kentucky Straight Bourbon Whiskey",
  "45% Alc./Vol. (90 Proof)",
  "750 mL",
  "Bottled by Old Tom Distillery, Frankfort, KY",
  WARNING,
];
const result = (field, txt = lines, a = app, options = {}) =>
  compareApplication(a, [panel(txt, options)]).find((r) => r.field === field);
test("clear evidence matches six applicable text fields; manual checks remain", () => {
  const rs = compareApplication(app, [panel(lines)]);
  assert.equal(rs.filter((r) => r.status === "Match").length, 6);
  assert.equal(rs.filter((r) => r.status === "Manual Review").length, 2);
});
test("normalizes curly apostrophe, capitalization and harmless whitespace", () =>
  assert.equal(normalizeText("STONE’S THROW"), normalizeText("Stone's Throw")));
test("preserves token boundaries and diacritics", () => {
  assert.notEqual(normalizeText("AB C"), normalizeText("A BC"));
  assert.notEqual(normalizeText("café"), normalizeText("cafe"));
});
test("& and and normalize equally", () =>
  assert.equal(normalizeText("Oak & Ash"), normalizeText("oak and ash")));
test("text difference does not fuzzy-approve", () =>
  assert.equal(
    result("brand", ["OLD TIM DISTILLERY", ...lines.slice(1)]).status,
    "Mismatch",
  ));
test("independent extraction does not receive expected values", () =>
  assert.equal(
    extractCandidates([panel(lines)]).brand[0].text,
    "OLD TOM DISTILLERY",
  ));
test("metric quantities convert", () => {
  assert.deepEqual(parseVolume("0.75 L"), { value: 750, unit: "mL" });
  assert.deepEqual(parseVolume("75 cL"), { value: 750, unit: "mL" });
  assert.equal(
    result(
      "netContents",
      lines.map((x) => (x === "750 mL" ? "0.75 L" : x)),
    ).status,
    "Match",
  );
});
test("invalid or nonpositive volumes rejected", () => {
  for (const x of ["-1 L", "0 mL", "750", "NaN L", "12 oz"])
    assert.equal(parseVolume(x), null);
});
test("numeric discrepancy is mismatch", () =>
  assert.equal(
    result(
      "abv",
      lines.map((x) => (x.startsWith("45%") ? "40% Alc./Vol." : x)),
    ).status,
    "Mismatch",
  ));
test("uncertain digit never becomes automatic match", () =>
  assert.equal(
    result("abv", lines, app, { minWordConfidence: 40 }).status,
    "Manual Review",
  ));
test("conflicting percentages require manual review", () =>
  assert.equal(
    result("abv", [...lines, "40% Alc./Vol."]).status,
    "Manual Review",
  ));
test("ranges require manual review", () =>
  assert.equal(
    result(
      "abv",
      lines.map((x) => (x.startsWith("45%") ? "40% to 45% Alc./Vol." : x)),
    ).status,
    "Manual Review",
  ));
test("less-than qualifier is not an exact percentage", () =>
  assert.equal(
    result(
      "abv",
      lines.map((x) => (x.startsWith("45%") ? "Less than 45% Alc./Vol." : x)),
    ).status,
    "Manual Review",
  ));
test("proof alone cannot establish declared ABV", () =>
  assert.equal(
    result(
      "abv",
      lines.map((x) => (x.startsWith("45%") ? "90 Proof" : x)),
    ).status,
    "Unable to Verify",
  ));
test("inconsistent proof escalates matched percentage", () =>
  assert.equal(
    result(
      "abv",
      lines.map((x) => (x.startsWith("45%") ? "45% Alc./Vol. (80 Proof)" : x)),
    ).status,
    "Manual Review",
  ));
test("US and metric values are not silently rounded", () =>
  assert.equal(
    result(
      "netContents",
      lines.map((x) => (x === "750 mL" ? "25.4 fl oz" : x)),
    ).status,
    "Manual Review",
  ));
test("missing evidence is unable, not mismatch", () =>
  assert.equal(result("brand", []).status, "Unable to Verify"));
test("repeated identical candidates still account for weak OCR", () => {
  const ps = [panel(lines), panel(lines, { confidence: 30, index: 1 })];
  assert.equal(compareApplication(app, ps)[0].status, "Manual Review");
});
test("two distinct brands across panels require manual review", () =>
  assert.equal(
    compareApplication(app, [
      panel(lines),
      panel(["ANOTHER BRAND"], { index: 1 }),
    ])[0].status,
    "Manual Review",
  ));
test("warning whitespace may wrap", () =>
  assert.equal(
    checkWarning([panel([WARNING.replaceAll(" ", "  \n")])]).status,
    "Match",
  ));
test("warning body capitalization permitted, heading strict", () =>
  assert.equal(checkWarning([panel([WARNING.toUpperCase()])]).status, "Match"));
test("title-case warning heading fails", () =>
  assert.equal(
    checkWarning([
      panel([WARNING.replace("GOVERNMENT WARNING", "Government Warning")]),
    ]).status,
    "Mismatch",
  ));
test("changed warning word fails", () =>
  assert.equal(
    checkWarning([panel([WARNING.replace("should not drink", "should drink")])])
      .status,
    "Mismatch",
  ));
test("missing warning punctuation fails", () =>
  assert.equal(
    checkWarning([panel([WARNING.replace("General,", "General")])]).status,
    "Mismatch",
  ));
test("low-confidence exact warning still needs review", () =>
  assert.equal(
    checkWarning([panel([WARNING], { confidence: 60 })]).status,
    "Manual Review",
  ));
test("multiple conflicting warnings require review", () =>
  assert.equal(
    checkWarning([
      panel([WARNING]),
      panel([WARNING.replace("should not", "should")]),
    ]).status,
    "Manual Review",
  ));
test("warning missing heading is not accepted", () =>
  assert.equal(
    checkWarning([panel([WARNING.replace("GOVERNMENT WARNING: ", "")])]).status,
    "Mismatch",
  ));
test("absent warning is unable to verify", () =>
  assert.equal(
    checkWarning([panel(lines.slice(0, -1))]).status,
    "Unable to Verify",
  ));
test("fields following a warning can be extracted", () =>
  assert.equal(
    result("abv", [WARNING, ...lines.slice(0, -1)]).status,
    "Match",
  ));
test("import origin must match", () => {
  const a = { ...app, imported: true, origin: "France" };
  assert.equal(
    result("origin", [...lines, "Product of Italy"], a).status,
    "Mismatch",
  );
});
test("domestic review does not invent an origin check", () =>
  assert.ok(
    !compareApplication(app, [panel(lines)]).some((r) => r.field === "origin"),
  ));
test("malt blank ABV requires applicability review", () =>
  assert.equal(
    result("abv", lines, { ...app, beverage: "malt", abv: "" }).status,
    "Manual Review",
  ));
test("table-wine omission is manual, not match", () =>
  assert.equal(
    result("abv", ["TEST VINEYARD", "Table Wine"], {
      ...app,
      beverage: "wine",
      abv: "12",
      classType: "Table Wine",
    }).status,
    "Manual Review",
  ));
test("below 0.5% warning applicability needs human review", () =>
  assert.equal(
    result("warning", lines, { ...app, abv: "0.4" }).status,
    "Manual Review",
  ));
test("invalid expected data rejected before comparison", () => {
  assert.throws(() => compareApplication({ ...app, abv: "200" }, []));
  assert.ok(validateApplication({ ...app, imported: true, origin: "" }).origin);
  assert.ok(validateApplication({ ...app, brand: "" }).brand);
});
