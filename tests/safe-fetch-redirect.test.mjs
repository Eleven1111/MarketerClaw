import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { gzipSync } from "node:zlib";
import { safeFetch, assertPublicHost } from "../scripts/lib.mjs";

// safeFetch vets the hostname it is given, but a public site can answer 302
// with `Location: http://127.0.0.1/...` (or a cloud metadata address). If the
// redirect is followed blindly, the private response is read back.
//
// A test cannot own a public host, so `resolveHost` treats "public.test" as an
// already-vetted public host pinned to this local server; every other host
// (including the 127.0.0.1 a redirect points at) goes through the real guard.

const publicTest = (host) =>
  host === "public.test" ? { address: "127.0.0.1", family: 4 } : assertPublicHost(host);

let server;
let port;
const hits = [];

before(async () => {
  server = createServer((req, res) => {
    hits.push(req.url);
    const redirect = (to) => res.writeHead(302, { Location: to }).end();
    if (req.url === "/to-internal") return redirect(`http://127.0.0.1:${port}/secret`);
    if (req.url === "/to-same-host") return redirect("/ok");
    if (req.url === "/to-ftp") return redirect("ftp://public.test/file");
    if (req.url === "/loop") return redirect("/loop");
    if (req.url === "/secret") return res.end("INTERNAL-SECRET");
    if (req.url === "/ok") return res.end("public page");
    if (req.url === "/big") return res.end("x".repeat(4096));
    if (req.url === "/bomb")
      return res.writeHead(200, { "Content-Encoding": "gzip" }).end(gzipSync(Buffer.alloc(8 * 1024 * 1024)));
    res.writeHead(404).end();
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  port = server.address().port;
});

after(() => server.close());

const at = (path) => `http://public.test:${port}${path}`;

test("a redirect to a private address is refused before it is requested", async () => {
  hits.length = 0;
  const res = await safeFetch(at("/to-internal"), { resolveHost: publicTest, timeoutMs: 3000 });
  assert.equal(res.ok, false);
  assert.equal(res.text, null);
  assert.match(res.error ?? "", /Blocked: 127\.0\.0\.1/);
  assert.deepEqual(hits, ["/to-internal"], "the internal URL must never be requested");
});

test("a redirect to a public host is still followed", async () => {
  const res = await safeFetch(at("/to-same-host"), { resolveHost: publicTest, timeoutMs: 3000 });
  assert.equal(res.ok, true);
  assert.equal(res.status, 200);
  assert.equal(res.text, "public page");
});

test("a redirect to a non-http(s) scheme is refused", async () => {
  const res = await safeFetch(at("/to-ftp"), { resolveHost: publicTest, timeoutMs: 3000 });
  assert.equal(res.ok, false);
  assert.match(res.error ?? "", /Unsupported protocol: ftp:/);
});

test("a redirect loop stops after the hop limit", async () => {
  hits.length = 0;
  const res = await safeFetch(at("/loop"), { resolveHost: publicTest, timeoutMs: 3000 });
  assert.equal(res.ok, false);
  assert.match(res.error ?? "", /Too many redirects/);
  assert.equal(hits.length, 6, "entry request + 5 followed hops");
});

test("redirect: 'manual' still hands the 3xx back to the caller", async () => {
  hits.length = 0;
  const res = await safeFetch(at("/to-internal"), { resolveHost: publicTest, redirect: "manual", timeoutMs: 3000 });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), `http://127.0.0.1:${port}/secret`);
  assert.deepEqual(hits, ["/to-internal"]);
});

test("a host with any private address among its records is refused", async () => {
  const mixed = async (host, opts) =>
    opts?.all
      ? [{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.5", family: 4 }]
      : { address: "93.184.216.34", family: 4 };
  await assert.rejects(() => assertPublicHost("mixed.example", mixed), /Blocked: mixed\.example .*10\.0\.0\.5/);
  const res = await safeFetch("http://mixed.example/", {
    resolveHost: (h) => assertPublicHost(h, mixed),
    timeoutMs: 3000,
  });
  assert.equal(res.ok, false);
  assert.match(res.error ?? "", /Blocked: mixed\.example .*10\.0\.0\.5/);
});

test("a body over maxBytes fails instead of being read into memory", async () => {
  const res = await safeFetch(at("/big"), { resolveHost: publicTest, timeoutMs: 3000, maxBytes: 1024 });
  assert.equal(res.ok, false);
  assert.equal(res.text, null);
  assert.match(res.error ?? "", /exceeds 1024 bytes/);
  const fits = await safeFetch(at("/big"), { resolveHost: publicTest, timeoutMs: 3000, maxBytes: 4096 });
  assert.equal(fits.text.length, 4096);
});

test("the default cap stops a gzip bomb that is small on the wire", async () => {
  const res = await safeFetch(at("/bomb"), { resolveHost: publicTest, timeoutMs: 3000 });
  assert.equal(res.ok, false);
  assert.match(res.error ?? "", /exceeds 5242880 bytes/);
});

