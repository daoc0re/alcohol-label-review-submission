import { createWorker, OEM, PSM, type Worker, type Page } from "tesseract.js";
import type { PreparedImage } from "./images";
import type { OcrPanel } from "./types";
export type OcrProgress = (message: string, percent: number) => void;
export function mapOcr(
  data: Page,
  image: Pick<PreparedImage, "name" | "width" | "height" | "qualityNotes">,
  panel: number,
  seconds: number,
): OcrPanel {
  const lines = (data.blocks ?? [])
    .flatMap((b) => b.paragraphs.flatMap((p) => p.lines))
    .filter((l) => l.text.trim())
    .map((l) => ({
      text: l.text.trim(),
      confidence: l.confidence,
      minWordConfidence: l.words.length
        ? Math.min(...l.words.map((w) => w.confidence))
        : 0,
      box: l.bbox,
      panel,
    }));
  return {
    name: image.name,
    text: data.text,
    confidence: data.confidence,
    lines,
    width: image.width,
    height: image.height,
    seconds,
    qualityNotes: [
      ...image.qualityNotes,
      ...(data.confidence < 80
        ? ["Overall OCR quality is uncertain. Inspect all evidence."]
        : []),
    ],
  };
}
/** Single reusable worker. No language-data persistence, credentials, or external endpoint. */
export class OcrService {
  private worker: Worker | null = null;
  private pending: Promise<Worker> | null = null;
  private generation = 0;
  private progress: OcrProgress = () => {};
  async ready(): Promise<Worker> {
    if (this.worker) return this.worker;
    if (this.pending) return this.pending;
    const generation = this.generation;
    this.pending = createWorker("eng", OEM.LSTM_ONLY, {
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr",
      langPath: "/ocr",
      workerBlobURL: false,
      cacheMethod: "none",
      gzip: true,
      logger: (m) => this.progress(m.status, m.progress * 100),
      errorHandler: () => {},
    })
      .then(async (w) => {
        if (generation !== this.generation) {
          await w.terminate();
          throw new Error("Review cancelled.");
        }
        await w.setParameters({
          tessedit_pageseg_mode: PSM.AUTO,
          user_defined_dpi: "300",
        });
        this.worker = w;
        return w;
      })
      .finally(() => {
        if (generation === this.generation) this.pending = null;
      });
    return this.pending;
  }
  async recognize(
    image: PreparedImage,
    index: number,
    signal: AbortSignal,
    onProgress: OcrProgress,
  ): Promise<OcrPanel> {
    this.progress = onProgress;
    const start = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let rejectAbort: (() => void) | undefined;
    const deadline = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(new Error("Review cancelled."));
      if (signal.aborted) rejectAbort();
      else signal.addEventListener("abort", rejectAbort, { once: true });
      timer = setTimeout(() => {
        void this.dispose();
        reject(
          new Error(
            "OCR exceeded 25 seconds for this panel. Try a clearer, tighter crop or a smaller image.",
          ),
        );
      }, 25000);
    });
    try {
      const work = (async () => {
        const worker = await this.ready();
        if (signal.aborted) throw new Error("Review cancelled.");
        const { data } = await worker.recognize(
          image.blob,
          {},
          { text: true, blocks: true },
        );
        if (signal.aborted) throw new Error("Review cancelled.");
        if (data.text.trim().replace(/[^a-z0-9]/gi, "").length < 8)
          throw new Error(
            `No readable label text was found in ${image.name}. Try a sharper image with the full label visible.`,
          );
        return mapOcr(data, image, index, (performance.now() - start) / 1000);
      })();
      return await Promise.race([work, deadline]);
    } finally {
      clearTimeout(timer);
      if (rejectAbort) signal.removeEventListener("abort", rejectAbort);
      this.progress = () => {};
    }
  }
  async dispose() {
    this.generation++;
    const w = this.worker;
    this.worker = null;
    this.pending = null;
    if (w) await w.terminate();
  }
}
