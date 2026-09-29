import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { inspectHeader, validateHeader } from "../.test-build/images.mjs";
for (const ext of ["png", "jpg", "webp"])
  test(`reads actual ${ext} header`, async () => {
    const h = inspectHeader(
      new Uint8Array(await readFile(`public/samples/old-tom.${ext}`)),
    );
    assert.equal(h.width, 1500);
    assert.equal(h.height, 1200);
  });
test("rejects a renamed document", () =>
  assert.throws(() =>
    inspectHeader(
      new TextEncoder().encode(
        "%PDF-1.7 not an image despite its filename ........",
      ),
    ),
  ));
test("rejects truncated header", () =>
  assert.throws(() => inspectHeader(new Uint8Array(12))));
test("bounds image dimensions before decode", () => {
  for (const [width, height] of [
    [99, 100],
    [8001, 500],
    [5000, 5000],
    [0, 100],
  ])
    assert.throws(() => validateHeader({ mime: "image/png", width, height }));
});
test("allows exactly the dimension limit", () =>
  assert.doesNotThrow(() =>
    validateHeader({ mime: "image/png", width: 5000, height: 4000 }),
  ));
test("rejects animated WebP", () => {
  const b = new Uint8Array(30);
  b.set(new TextEncoder().encode("RIFF"), 0);
  b.set(new TextEncoder().encode("WEBPVP8X"), 8);
  b[20] = 2;
  assert.throws(() => inspectHeader(b), /Animated/);
});
