import ts from "typescript";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
await mkdir(".test-build", { recursive: true });
for (const name of ["rules", "images", "ocr", "samples", "types"]) {
  const source = await readFile(`lib/review/${name}.ts`, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  });
  await writeFile(`.test-build/${name}.mjs`, outputText);
}
const result = spawnSync(
  process.execPath,
  [
    "--test",
    "tests/rules.test.mjs",
    "tests/images.test.mjs",
    "tests/server.test.mjs",
  ],
  { stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
