/** Actual Tesseract integration tests, with no canned recognized text. */
import { createWorker, OEM, PSM } from "tesseract.js";
import { resolve } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { SAMPLES } from "../.test-build/samples.mjs";
import { mapOcr } from "../.test-build/ocr.mjs";
import { compareApplication } from "../.test-build/rules.mjs";
import { spawnSync } from "node:child_process";
const copy = spawnSync(process.execPath, ["scripts/copy-ocr-assets.mjs"], {
  stdio: "inherit",
});
if (copy.status !== 0) process.exit(copy.status ?? 1);
const start = performance.now();
const worker = await createWorker("eng", OEM.LSTM_ONLY, {
  langPath: resolve("public/ocr"),
  cacheMethod: "none",
  gzip: true,
});
await worker.setParameters({
  tessedit_pageseg_mode: PSM.AUTO,
  user_defined_dpi: "300",
});
const initializationSeconds = (performance.now() - start) / 1000,
  records = [];
try {
  for (const sample of SAMPLES) {
    const t = performance.now(),
      panels = [];
    for (const [i, file] of sample.files.entries()) {
      const p = performance.now();
      const { data } = await worker.recognize(
        resolve("public/samples", file),
        {},
        { text: true, blocks: true },
      );
      panels.push(
        mapOcr(
          data,
          { name: file, width: 1500, height: 1200, qualityNotes: [] },
          i,
          (performance.now() - p) / 1000,
        ),
      );
    }
    const results = compareApplication(sample.application, panels),
      statuses = Object.fromEntries(results.map((r) => [r.field, r.status]));
    if (sample.id === "old-tom")
      assert.equal(results.filter((r) => r.status === "Match").length, 6);
    if (sample.id === "mismatch") {
      assert.equal(statuses.abv, "Mismatch");
      assert.equal(statuses.warning, "Mismatch");
    }
    if (sample.id === "warning-case")
      assert.equal(statuses.warning, "Mismatch");
    if (sample.id === "ambiguous") assert.equal(statuses.abv, "Manual Review");
    if (sample.id === "import") assert.equal(statuses.origin, "Match");
    if (sample.id === "stones") assert.equal(statuses.brand, "Match");
    if (sample.id === "blank") assert.ok(panels.every((p) => !p.text.trim()));
    if (sample.id === "poor") assert.notEqual(statuses.warning, "Match");
    const record = {
      id: sample.id,
      seconds: (performance.now() - t) / 1000,
      statuses,
      panels,
    };
    records.push(record);
    console.log(
      sample.id,
      record.seconds.toFixed(2) + "s",
      JSON.stringify(statuses),
    );
  }
} finally {
  await worker.terminate();
  await mkdir("reports", { recursive: true });
  await writeFile(
    "reports/ocr-results.json",
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        runtime: process.version,
        platform: process.platform,
        initializationSeconds,
        records,
      },
      null,
      2,
    ) + "\n",
  );
}
