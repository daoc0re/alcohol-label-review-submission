import { test } from "node:test";
import assert from "node:assert/strict";
import { server } from "../scripts/serve.mjs";
import { resolve } from "node:path";
test("static server applies headers, has no write API, and confines files", async () => {
  const s = server(resolve("public"));
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${s.address().port}`;
  try {
    const r = await fetch(url + "/samples/old-tom.png");
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
    assert.match(
      r.headers.get("content-security-policy"),
      /connect-src 'self'/,
    );
    assert.equal(
      (await fetch(url + "/", { method: "POST", body: "private" })).status,
      405,
    );
    assert.equal((await fetch(url + "/.env")).status, 403);
    assert.equal((await fetch(url + "/%2e%2e%2fpackage.json")).status, 403);
    assert.equal((await fetch(url + "/not-present")).status, 404);
  } finally {
    s.closeAllConnections();
    await new Promise((r) => s.close(r));
  }
});
