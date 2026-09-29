import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ScanLine,
  ShieldCheck,
  Upload,
  ArrowRight,
  RotateCw,
  X,
  AlertTriangle,
  Eye,
  FileImage,
  Trash2,
  ListPlus,
  ChevronRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  EMPTY_APPLICATION,
  type Application,
  type Review,
  type Result,
  type OcrPanel,
} from "@/lib/review/types";
import { compareApplication, validateApplication } from "@/lib/review/rules";
import {
  prepareImage,
  releaseImages,
  cloneImages,
  LIMITS,
  type PreparedImage,
} from "@/lib/review/images";
import { OcrService } from "@/lib/review/ocr";
import { SAMPLES } from "@/lib/review/samples";
import { Findings } from "./findings";
import { ReviewFooter } from "./footer";

type Job = {
  id: string;
  application: Application;
  images: PreparedImage[];
  state: "Queued" | "Processing" | "Complete" | "Error";
  review?: Review;
  error?: string;
};
function Choice({
  id,
  label,
  value,
  items,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  items: [string, string][];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="choice">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
export function ReviewWorkspace() {
  const [app, setApp] = useState<Application>({ ...EMPTY_APPLICATION }),
    [images, setImages] = useState<PreparedImage[]>([]),
    [review, setReview] = useState<Review | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false),
    [preparing, setPreparing] = useState(false),
    [progress, setProgress] = useState({ message: "", percent: 0 }),
    [elapsed, setElapsed] = useState(0);
  const [selectedPanel, setSelectedPanel] = useState(0),
    [evidence, setEvidence] = useState<Result | null>(null),
    [sample, setSample] = useState("old-tom");
  const [queue, setQueue] = useState<Job[]>([]),
    [batchOpen, setBatchOpen] = useState(false),
    [zoom, setZoom] = useState(false);
  const service = useRef<OcrService | null>(null),
    abort = useRef<AbortController | null>(null),
    latestImages = useRef(images),
    latestQueue = useRef(queue);
  const upload = useRef<HTMLInputElement>(null),
    errorHeading = useRef<HTMLDivElement>(null),
    runLock = useRef(false),
    prepLock = useRef(false),
    session = useRef(0),
    nextJob = useRef(0);
  const locked = busy || preparing;
  latestImages.current = images;
  latestQueue.current = queue;
  useEffect(
    () => () => {
      abort.current?.abort();
      void service.current?.dispose();
      releaseImages(latestImages.current);
      latestQueue.current.forEach((j) => releaseImages(j.images));
    },
    [],
  );
  useEffect(() => {
    if (!busy) return;
    const start = performance.now();
    setElapsed(0);
    const timer = setInterval(
      () => setElapsed((performance.now() - start) / 1000),
      250,
    );
    return () => clearInterval(timer);
  }, [busy]);
  useEffect(() => {
    const clear = () => {
      session.current++;
      abort.current?.abort();
      void service.current?.dispose();
      releaseImages(latestImages.current);
      latestQueue.current.forEach((j) => releaseImages(j.images));
      setImages([]);
      setQueue([]);
      setApp({ ...EMPTY_APPLICATION });
      setReview(null);
      setEvidence(null);
      setBusy(false);
      setPreparing(false);
    };
    window.addEventListener("pagehide", clear);
    return () => window.removeEventListener("pagehide", clear);
  }, []);
  const invalidate = () => {
    setReview(null);
    setEvidence(null);
    setNotice("");
  };
  const change = (key: keyof Application, value: string | boolean) => {
    invalidate();
    setApp((a) => ({ ...a, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  const showError = (message: string) => {
    setError(message);
    setTimeout(() => errorHeading.current?.focus(), 0);
  };
  const focusResults = () =>
    setTimeout(() => document.getElementById("results-heading")?.focus(), 0);
  function validate() {
    const e = validateApplication(app);
    setErrors(e);
    if (Object.keys(e).length) {
      showError("Check the application fields marked below.");
      return false;
    }
    if (!images.length) {
      showError("Add at least one label image before comparing.");
      return false;
    }
    return true;
  }
  async function addFiles(files: File[]) {
    if (prepLock.current || runLock.current) return;
    if (!files.length) return;
    if (images.length + files.length > LIMITS.panels) {
      showError(
        "Use up to four panels for one application. Use the batch queue for separate applications.",
      );
      return;
    }
    prepLock.current = true;
    setPreparing(true);
    setError("");
    const added: PreparedImage[] = [];
    const current = session.current;
    try {
      for (const file of files) added.push(await prepareImage(file));
      if (current !== session.current) {
        releaseImages(added);
        return;
      }
      invalidate();
      setImages((prev) => [...prev, ...added]);
      setNotice(`${added.length} image${added.length === 1 ? "" : "s"} added.`);
    } catch (e) {
      releaseImages(added);
      showError(
        e instanceof Error ? e.message : "The artwork could not be prepared.",
      );
    } finally {
      prepLock.current = false;
      setPreparing(false);
      if (upload.current) upload.current.value = "";
    }
  }
  async function loadSample() {
    if (prepLock.current || runLock.current) return;
    prepLock.current = true;
    setPreparing(true);
    setError("");
    const added: PreparedImage[] = [];
    const current = session.current;
    try {
      const s = SAMPLES.find((s) => s.id === sample)!;
      for (const name of s.files) {
        const r = await fetch("/samples/" + name);
        if (!r.ok)
          throw new Error(
            "The sample image is unavailable. You can still choose your own image.",
          );
        added.push(
          await prepareImage(
            new File([await r.blob()], name, { type: "image/png" }),
          ),
        );
      }
      if (current !== session.current) {
        releaseImages(added);
        return;
      }
      releaseImages(images);
      invalidate();
      setImages(added);
      setApp({ ...s.application });
      setErrors({});
      setSelectedPanel(0);
      setNotice("Synthetic example loaded. Select Compare label to run OCR.");
    } catch (e) {
      releaseImages(added);
      showError(
        e instanceof Error ? e.message : "The sample could not be loaded.",
      );
    } finally {
      prepLock.current = false;
      setPreparing(false);
    }
  }
  async function rotate(index: number) {
    if (locked) return;
    prepLock.current = true;
    setPreparing(true);
    setError("");
    try {
      const old = images[index],
        next = await prepareImage(
          new File([old.blob], old.name, { type: "image/png" }),
          90,
        );
      releaseImages([old]);
      invalidate();
      setImages((xs) => xs.map((x, i) => (i === index ? next : x)));
    } catch (e) {
      showError(e instanceof Error ? e.message : "Rotation failed.");
    } finally {
      prepLock.current = false;
      setPreparing(false);
    }
  }
  async function perform(
    application: Application,
    artwork: PreparedImage[],
    signal: AbortSignal,
    prefix = "",
  ): Promise<Review> {
    const start = performance.now(),
      panels: OcrPanel[] = [];
    service.current ??= new OcrService();
    for (let i = 0; i < artwork.length; i++)
      panels.push(
        await service.current.recognize(
          artwork[i],
          i,
          signal,
          (message, percent) =>
            setProgress({
              message: `${prefix}Panel ${i + 1} of ${artwork.length} · ${message}`,
              percent: ((i + percent / 100) / artwork.length) * 100,
            }),
        ),
      );
    if (signal.aborted) throw new Error("Review cancelled.");
    return {
      application: { ...application },
      panels,
      results: compareApplication(application, panels),
      seconds: (performance.now() - start) / 1000,
      completedAt: new Date().toISOString(),
    };
  }
  async function compare(event?: FormEvent) {
    event?.preventDefault();
    if (runLock.current || prepLock.current || !validate()) return;
    runLock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    setReview(null);
    setEvidence(null);
    setProgress({ message: "Preparing the local OCR engine…", percent: 0 });
    abort.current = new AbortController();
    const current = session.current;
    try {
      const r = await perform({ ...app }, images, abort.current.signal);
      if (current !== session.current) return;
      setReview(r);
      setNotice(
        "Comparison complete. Inspect findings and complete the manual checks.",
      );
      focusResults();
    } catch (e) {
      if (current === session.current)
        showError(
          e instanceof Error
            ? e.message
            : "The comparison failed. Try a clearer image.",
        );
      await service.current?.dispose();
    } finally {
      runLock.current = false;
      setBusy(false);
    }
  }
  async function cancel() {
    abort.current?.abort();
    await service.current?.dispose();
  }
  function clearAll() {
    if (locked) return;
    session.current++;
    void cancel();
    releaseImages(images);
    queue.forEach((j) => releaseImages(j.images));
    setImages([]);
    setQueue([]);
    setApp({ ...EMPTY_APPLICATION });
    setErrors({});
    setError("");
    setReview(null);
    setEvidence(null);
    setSelectedPanel(0);
    setNotice(
      "Application details, artwork, and results cleared from this page.",
    );
    if (upload.current) upload.current.value = "";
  }
  function enqueue() {
    if (locked || !validate()) return;
    if (queue.length >= LIMITS.jobs) {
      showError("This prototype supports up to 10 applications in one batch.");
      return;
    }
    const bytes =
      queue.reduce(
        (sum, j) => sum + j.images.reduce((n, i) => n + i.blob.size, 0),
        0,
      ) + images.reduce((n, i) => n + i.blob.size, 0);
    if (bytes > LIMITS.batchBytes) {
      showError(
        "The batch artwork exceeds the 50 MB in-memory budget. Remove entries or use smaller images.",
      );
      return;
    }
    setQueue((q) => [
      ...q,
      {
        id: String(++nextJob.current),
        application: { ...app },
        images: cloneImages(images),
        state: "Queued",
      },
    ]);
    setBatchOpen(true);
    setNotice(
      "Application added to the batch with its current details and artwork.",
    );
  }
  async function runBatch() {
    if (runLock.current || prepLock.current) return;
    const pending = queue.filter(
      (j) => j.state === "Queued" || j.state === "Error",
    );
    if (!pending.length) return;
    runLock.current = true;
    setBusy(true);
    setError("");
    setReview(null);
    setEvidence(null);
    abort.current = new AbortController();
    const current = session.current;
    try {
      for (let i = 0; i < pending.length; i++) {
        if (abort.current.signal.aborted || current !== session.current) break;
        const j = pending[i];
        setQueue((q) =>
          q.map((x) =>
            x.id === j.id
              ? {
                  ...x,
                  state: "Processing",
                  error: undefined,
                  review: undefined,
                }
              : x,
          ),
        );
        try {
          const r = await perform(
            j.application,
            j.images,
            abort.current.signal,
            `Application ${i + 1} of ${pending.length} · `,
          );
          if (current === session.current)
            setQueue((q) =>
              q.map((x) =>
                x.id === j.id ? { ...x, state: "Complete", review: r } : x,
              ),
            );
        } catch (e) {
          if (current === session.current)
            setQueue((q) =>
              q.map((x) =>
                x.id === j.id
                  ? {
                      ...x,
                      state: abort.current?.signal.aborted ? "Queued" : "Error",
                      error:
                        e instanceof Error ? e.message : "Comparison failed.",
                    }
                  : x,
              ),
            );
          await service.current?.dispose();
          if (abort.current.signal.aborted) break;
        }
      }
      if (current === session.current)
        setNotice(
          abort.current.signal.aborted
            ? "Batch stopped. Unprocessed applications remain queued."
            : "Batch finished. Open each completed application to inspect its findings.",
        );
    } finally {
      runLock.current = false;
      setBusy(false);
    }
  }
  function openJob(j: Job) {
    if (locked) return;
    releaseImages(images);
    setImages(cloneImages(j.images));
    setApp({ ...j.application });
    setReview(j.review ?? null);
    setErrors({});
    setError(j.error ?? "");
    setSelectedPanel(0);
    setEvidence(null);
    if (j.review) focusResults();
  }
  function viewEvidence(r: Result) {
    setEvidence(r);
    if (r.evidence[0]) setSelectedPanel(r.evidence[0].panel);
    document.getElementById("artwork-heading")?.focus();
  }
  const activeImage = images[selectedPanel] ?? images[0],
    activeIndex = images[selectedPanel] ? selectedPanel : 0;
  const visibleEvidence =
    evidence?.evidence.filter((l) => l.panel === activeIndex) ?? [];
  function input(
    key: keyof Application,
    label: string,
    placeholder: string,
    help?: string,
  ) {
    return (
      <div className={"field " + (key === "business" ? "wide" : "")}>
        <label htmlFor={key}>{label}</label>
        {key === "business" ? (
          <textarea
            id={key}
            value={String(app[key])}
            onChange={(e) => change(key, e.target.value)}
            maxLength={400}
            rows={2}
            placeholder={placeholder}
            aria-invalid={!!errors[key]}
            aria-describedby={
              errors[key] ? `${key}-error` : help ? `${key}-help` : undefined
            }
          />
        ) : (
          <input
            id={key}
            value={String(app[key])}
            onChange={(e) => change(key, e.target.value)}
            maxLength={key === "reference" ? 80 : 400}
            placeholder={placeholder}
            inputMode={key === "abv" ? "decimal" : undefined}
            autoComplete="off"
            aria-invalid={!!errors[key]}
            aria-describedby={
              errors[key] ? `${key}-error` : help ? `${key}-help` : undefined
            }
          />
        )}{" "}
        {help && (
          <p className="field-help" id={`${key}-help`}>
            {help}
          </p>
        )}
        {errors[key] && (
          <p className="field-error" id={`${key}-error`}>
            {errors[key]}
          </p>
        )}
      </div>
    );
  }
  return (
    <>
      <a className="skip-link" href="#application-heading">
        Skip to application details
      </a>
      <header className="app-header">
        <div className="header-inner">
          <div className="wordmark">
            <span className="mark">
              <ScanLine aria-hidden="true" />
            </span>
            <span>Label Review</span>
            <span className="prototype">Prototype</span>
          </div>
          <div className="privacy-indicator">
            <ShieldCheck aria-hidden="true" />
            <span>Artwork stays in this browser</span>
          </div>
        </div>
      </header>
      <main className="main-shell">
        <div className="page-intro">
          <div>
            <p className="eyebrow">ALCOHOL LABEL VERIFICATION</p>
            <h1>
              Compare with confidence.
              <br className="mobile-break" /> Keep the judgment.
            </h1>
            <p>
              Check label artwork against application details. Inspect the
              evidence behind every finding.
            </p>
          </div>
          <button
            type="button"
            className="button secondary clear"
            onClick={clearAll}
            disabled={locked}
            aria-label="Clear session"
          >
            <Trash2 aria-hidden="true" />
            <span>Clear session</span>
          </button>
        </div>
        <div className="scope-note">
          <Eye aria-hidden="true" />
          <span>
            <strong>Decision support only.</strong> A text match is not
            regulatory approval. A reviewer must resolve uncertainty and inspect
            the finished label.
          </span>
        </div>
        <div className="sample-bar">
          <div className="sample-copy">
            <strong>Try a synthetic example</strong>
            <span>Real image recognition. No prefilled results.</span>
          </div>
          <Choice
            id="sample"
            label="Example label"
            value={sample}
            items={SAMPLES.map((s) => [s.id, s.label])}
            onChange={setSample}
            disabled={locked}
          />
          <button
            type="button"
            className="button secondary"
            onClick={loadSample}
            disabled={locked}
          >
            {preparing ? "Preparing…" : "Load example"}
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
        <div
          ref={errorHeading}
          tabIndex={-1}
          className={error ? "error-banner" : "sr-only"}
          role={error ? "alert" : undefined}
        >
          {error && (
            <>
              <AlertTriangle aria-hidden="true" />
              <span>{error}</span>
            </>
          )}
        </div>
        <div className="sr-only" role="status" aria-live="polite">
          {notice}
        </div>
        <div className="workspace-grid">
          <section
            className="panel application-panel"
            aria-labelledby="application-heading"
          >
            <div className="panel-heading">
              <span className="section-number">01</span>
              <div>
                <h2 id="application-heading" tabIndex={-1}>
                  Application details
                </h2>
                <p>Enter what the label is expected to show.</p>
              </div>
            </div>
            <form onSubmit={compare} noValidate>
              <fieldset disabled={locked}>
                <legend className="sr-only">
                  Expected application information
                </legend>
                <div className="form-grid">
                  <Choice
                    id="beverage"
                    label="Beverage category"
                    value={app.beverage}
                    items={[
                      ["spirits", "Distilled spirits"],
                      ["wine", "Wine"],
                      ["malt", "Malt beverage"],
                    ]}
                    onChange={(v) => change("beverage", v)}
                    disabled={locked}
                  />
                  {input(
                    "reference",
                    "Application reference (optional)",
                    "e.g., REVIEW-001",
                  )}
                  {input("brand", "Brand name", "e.g., Old Tom Distillery")}
                  {input(
                    "classType",
                    "Class / type",
                    "e.g., Kentucky Straight Bourbon Whiskey",
                  )}
                  {input(
                    "abv",
                    app.beverage === "malt"
                      ? "Alcohol by volume % (optional)"
                      : "Alcohol by volume %",
                    "e.g., 45",
                    app.beverage === "wine"
                      ? "Enter the expected percentage even if a table-wine exception may apply."
                      : undefined,
                  )}
                  {input(
                    "netContents",
                    "Net contents",
                    "e.g., 750 mL",
                    "Use mL, L, cL, or US fl oz.",
                  )}
                  {input(
                    "business",
                    app.imported
                      ? "Importer / business statement"
                      : "Bottler / producer statement",
                    "e.g., Bottled by Old Tom Distillery, Frankfort, KY",
                    "Include the role, name, and location as expected on the label.",
                  )}
                  <div className="import-choice wide">
                    <Checkbox
                      id="imported"
                      checked={app.imported}
                      onCheckedChange={(v) => change("imported", v === true)}
                      disabled={locked}
                    />
                    <label htmlFor="imported">Imported product</label>
                    <span>Also compare the country of origin.</span>
                  </div>
                  {app.imported &&
                    input("origin", "Country of origin", "e.g., France")}
                </div>
              </fieldset>
              <div className="form-actions">
                <button
                  className="button primary"
                  type="submit"
                  disabled={locked}
                >
                  <ScanLine aria-hidden="true" />
                  {busy ? "Comparing…" : "Compare label"}
                  <ArrowRight aria-hidden="true" />
                </button>
                <button
                  className="button text-button"
                  type="button"
                  onClick={enqueue}
                  disabled={locked}
                >
                  <ListPlus aria-hidden="true" />
                  Add to batch
                </button>
              </div>
            </form>
            <p className="small-note">
              No account, API key, or submission required.
            </p>
          </section>
          <section
            className="panel artwork-panel"
            aria-labelledby="artwork-heading"
          >
            <div className="panel-heading">
              <span className="section-number">02</span>
              <div>
                <h2 id="artwork-heading" tabIndex={-1}>
                  Label artwork
                </h2>
                <p>Add front, back, or side panels for one application.</p>
              </div>
            </div>
            <div
              className={"dropzone " + (images.length ? "compact" : "")}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!locked) void addFiles(Array.from(e.dataTransfer.files));
              }}
            >
              <Upload aria-hidden="true" />
              <div>
                <strong>
                  {images.length
                    ? "Add another panel"
                    : "Drop label images here"}
                </strong>
                <p>PNG, JPEG, WebP · 10 MB each · up to 4 panels</p>
              </div>
              <button
                className="button secondary"
                type="button"
                onClick={() => upload.current?.click()}
                disabled={locked || images.length >= LIMITS.panels}
              >
                Choose images
              </button>
              <input
                ref={upload}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                disabled={locked}
                className="sr-only"
                tabIndex={-1}
                aria-label="Choose label image files"
                onChange={(e) =>
                  void addFiles(Array.from(e.target.files ?? []))
                }
              />
            </div>
            {images.length > 0 ? (
              <>
                <div className="panel-selector" aria-label="Artwork panels">
                  {images.map((image, i) => (
                    <div
                      className={
                        "panel-chip " + (i === activeIndex ? "selected" : "")
                      }
                      key={image.url}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPanel(i);
                          setZoom(false);
                        }}
                        aria-pressed={i === activeIndex}
                      >
                        <FileImage aria-hidden="true" />
                        <span>
                          {i + 1}. {image.name}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="remove"
                        aria-label={`Remove ${image.name}`}
                        disabled={locked}
                        onClick={() => {
                          releaseImages([image]);
                          invalidate();
                          setImages((xs) =>
                            xs.filter((_, index) => index !== i),
                          );
                          setSelectedPanel(0);
                        }}
                      >
                        <X aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
                {activeImage && (
                  <>
                    <div className="artwork-toolbar">
                      <span>
                        {activeImage.width} × {activeImage.height} px
                      </span>
                      <div>
                        <button
                          type="button"
                          className="inline-button"
                          onClick={() => setZoom(!zoom)}
                          aria-pressed={zoom}
                        >
                          {zoom ? "Fit image" : "Enlarge image"}
                        </button>
                        <button
                          type="button"
                          className="inline-button"
                          onClick={() => rotate(activeIndex)}
                          disabled={locked}
                        >
                          <RotateCw aria-hidden="true" />
                          Rotate 90°
                        </button>
                      </div>
                    </div>
                    <div
                      className={"artwork-stage " + (zoom ? "zoomed" : "")}
                      tabIndex={zoom ? 0 : undefined}
                      aria-label={
                        zoom ? "Enlarged artwork, scroll to inspect" : undefined
                      }
                    >
                      <div className="image-frame">
                        <img
                          src={activeImage.url}
                          alt={`Label artwork, panel ${activeIndex + 1}: ${activeImage.name}`}
                          width={activeImage.width}
                          height={activeImage.height}
                        />
                        {visibleEvidence.map((l, i) => (
                          <span
                            aria-hidden="true"
                            className="evidence-box"
                            key={i}
                            style={{
                              left: `${(l.box.x0 / activeImage.width) * 100}%`,
                              top: `${(l.box.y0 / activeImage.height) * 100}%`,
                              width: `${((l.box.x1 - l.box.x0) / activeImage.width) * 100}%`,
                              height: `${((l.box.y1 - l.box.y0) / activeImage.height) * 100}%`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    {evidence && (
                      <div className="evidence-caption">
                        <strong>{evidence.label}</strong>
                        <span>
                          {visibleEvidence.length
                            ? "Highlighted OCR evidence. Confirm it against the image."
                            : "No highlight on this panel. Inspect the artwork manually."}
                        </span>
                        <button
                          type="button"
                          className="inline-button"
                          onClick={() => setEvidence(null)}
                        >
                          Clear highlight
                        </button>
                      </div>
                    )}
                    {activeImage.qualityNotes.map((n) => (
                      <p className="quality-note" key={n}>
                        <AlertTriangle aria-hidden="true" />
                        {n}
                      </p>
                    ))}
                  </>
                )}
              </>
            ) : (
              <div className="artwork-empty">
                <div className="empty-paper">
                  <ScanLine aria-hidden="true" />
                </div>
                <strong>Your artwork and evidence appear here</strong>
                <p>
                  Use a clear, upright image with the complete label visible.
                  Add separate panels to check information printed on the back.
                </p>
              </div>
            )}
          </section>
        </div>
        {busy && (
          <section className="progress-panel" aria-label="Comparison progress">
            <div>
              <strong aria-live="polite">{progress.message}</strong>
              <span>{elapsed.toFixed(1)}s elapsed</span>
            </div>
            <Progress value={progress.percent} aria-label="OCR progress" />
            <div>
              <p>
                {elapsed > 5
                  ? "Still working. The five-second target has been exceeded; image complexity and device speed affect processing."
                  : "Reading artwork locally. The first comparison also initializes the OCR engine."}
              </p>
              <button
                className="button secondary"
                type="button"
                onClick={cancel}
              >
                Cancel
              </button>
            </div>
          </section>
        )}
        {queue.length > 0 && (
          <section className="panel batch-panel">
            <button
              type="button"
              className="batch-heading"
              onClick={() => setBatchOpen(!batchOpen)}
              aria-expanded={batchOpen}
              aria-controls="batch-content"
            >
              <ListPlus aria-hidden="true" />
              <span className="batch-title">Batch queue</span>
              <span>{queue.length} / 10 applications</span>
              <ChevronRight aria-hidden="true" />
            </button>
            <div id="batch-content" hidden={!batchOpen}>
              <p className="muted">
                Each entry keeps its own application details and artwork for
                this session. Processing is sequential.
              </p>
              <ol className="queue-list">
                {queue.map((j, i) => (
                  <li key={j.id}>
                    <div>
                      <strong>
                        {j.application.reference || `Application ${i + 1}`} ·{" "}
                        {j.application.brand}
                      </strong>
                      <span>
                        {j.images.length} panel
                        {j.images.length === 1 ? "" : "s"} · {j.state}
                        {j.review ? ` · ${j.review.seconds.toFixed(1)}s` : ""}
                      </span>
                      {j.error && <p className="field-error">{j.error}</p>}
                    </div>
                    <button
                      type="button"
                      className="button secondary"
                      disabled={locked}
                      onClick={() => openJob(j)}
                    >
                      {j.review ? "View findings" : "Open"}
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Remove queued application ${i + 1}`}
                      disabled={locked}
                      onClick={() => {
                        releaseImages(j.images);
                        setQueue((q) => q.filter((x) => x.id !== j.id));
                      }}
                    >
                      <X aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ol>
              <button
                className="button primary"
                type="button"
                onClick={runBatch}
                disabled={locked || queue.every((j) => j.state === "Complete")}
              >
                Compare queued applications
                <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </section>
        )}
        <Findings review={review} onEvidence={viewEvidence} />
        <ReviewFooter />
      </main>
    </>
  );
}
