import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import {
  mkdir,
  copyFile,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
const require = createRequire(import.meta.url),
  tess = dirname(require.resolve("tesseract.js/package.json")),
  core = dirname(
    createRequire(join(tess, "package.json")).resolve(
      "tesseract.js-core/package.json",
    ),
  ),
  lang = dirname(require.resolve("@tesseract.js-data/eng/package.json"));
await mkdir("public/ocr", { recursive: true });
const assets = [
  [join(tess, "dist/worker.min.js"), "worker.min.js"],
  [join(lang, "4.0.0/eng.traineddata.gz"), "eng.traineddata.gz"],
];
for (const name of await readdir(core))
  if (/^tesseract-core.*\.wasm(?:\.js)?$/.test(name))
    assets.push([join(core, name), name]);
const checksums = {};
for (const [source, name] of assets) {
  await copyFile(source, join("public/ocr", name));
  checksums[name] = createHash("sha256")
    .update(await readFile(source))
    .digest("hex");
}
for (const [root, prefix] of [
  [tess, "tesseract-js"],
  [core, "tesseract-core"],
  [lang, "english-data"],
]) {
  for (const name of await readdir(root))
    if (/^(?:license|notice|copying)(?:\.|$)/i.test(name))
      await copyFile(join(root, name), join("public/ocr", prefix + "-" + name));
}
await writeFile(
  "public/ocr/checksums.json",
  JSON.stringify(checksums, null, 2) + "\n",
);
console.log(`Copied ${assets.length} same-origin OCR assets.`);
