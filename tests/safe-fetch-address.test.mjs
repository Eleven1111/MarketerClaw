import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { gzipSync } from "node:zlib";
import { isBlockedIp, safeFetch } from "../scripts/lib.mjs";

// ── isBlockedIp: special-purpose ranges ─────────────────────────────────────
// Each blocked address sits in an IANA special-purpose range; each allowed one
// sits just outside a range edge, so an over-wide mask fails as loudly as a
// missing one.

const BLOCKED = [
  ["0.0.0.0", "this network"],
  ["100.64.0.1", "CGNAT 100.64/10 (low edge)"],
  ["100.127.255.255", "CGNAT 100.64/10 (high edge)"],
  ["192.0.0.1", "IETF protocol assignments"],
  ["192.0.2.1", "TEST-NET-1"],
  ["198.51.100.1", "TEST-NET-2"],
  ["203.0.113.1", "TEST-NET-3"],
  ["224.0.0.1", "multicast"],
  ["239.255.255.250", "multicast (SSDP)"],
  ["240.0.0.1", "reserved"],
  ["255.255.255.255", "broadcast"],
  ["::", "unspecified"],
  ["::ffff:7f00:1", "IPv4-mapped loopback, hex form"],
  ["::ffff:a00:5", "IPv4-mapped 10.0.0.5, hex form"],
  ["::FFFF:127.0.0.1", "IPv4-mapped loopback, upper case"],
  ["::7f00:1", "IPv4-compatible (deprecated)"],
  ["64:ff9b::7f00:1", "NAT64 well-known prefix"],
  ["64:ff9b:1::1", "NAT64 local-use prefix"],
  ["100::1", "discard-only"],
  ["2001::1", "Teredo / IETF protocol assignments"],
  ["2001:db8::1", "documentation"],
  ["2002:7f00:1::", "6to4"],
  ["fec0::1", "site-local (deprecated)"],
  ["ff02::1", "multicast"],
];

const ALLOWED = [
  ["8.8.8.8", "public"],
  ["100.63.255.255", "just below CGNAT"],
  ["100.128.0.0", "just above CGNAT"],
  // Deliberately allowed: Clash/Surge "fake-IP" proxies answer every DNS
  // query with 198.18.0.0/15 and forward by hostname, so blocking it would
  // break every fetch for those users while protecting nothing internal.
  ["198.18.0.1", "benchmarking range used by fake-IP proxies"],
  ["198.19.255.255", "benchmarking range used by fake-IP proxies"],
  ["223.255.255.255", "just below multicast"],
  ["::ffff:808:808", "IPv4-mapped public 8.8.8.8"],
  ["2606:4700:4700::1111", "public IPv6"],
  ["2001:4860:4860::8888", "public IPv6 outside 2001::/23"],
];

test("isBlockedIp refuses every special-purpose range", () => {
  const missed = BLOCKED.filter(([ip]) => !isBlockedIp(ip)).map(([ip, why]) => `${ip} (${why})`);
  assert.deepEqual(missed, []);
});

test("isBlockedIp still allows public addresses next to the range edges", () => {
  const wrong = ALLOWED.filter(([ip]) => isBlockedIp(ip)).map(([ip, why]) => `${ip} (${why})`);
  assert.deepEqual(wrong, []);
});

// ── DNS rebinding: connect to the vetted address ────────────────────────────
// The guard resolves the host, then the request used to resolve it again. A
// hostile DNS server can answer "public" the first time and "127.0.0.1" the
// second (TTL 0). The request must connect to the address the guard vetted.
//
// "rebind.test" is not a real host: a connect-time lookup fails (ENOTFOUND) or,
// behind a fake-IP proxy, lands on a 198.18.x.x address — never on this local
// server. The request can only reach it by using the vetted address directly.

let server;
let port;
const seen = [];

before(async () => {
  server = createServer((req, res) => {
    seen.push({ url: req.url, host: req.headers.host, encoding: req.headers["accept-encoding"] });
    if (req.url === "/gzip") {
      return res.writeHead(200, { "Content-Encoding": "gzip", "X-Probe": "yes" }).end(gzipSync("compressed page"));
    }
    res.end("vetted page");
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  port = server.address().port;
});

after(() => server.close());

function vettedOnce() {
  let calls = 0;
  const resolveHost = async (host) => {
    calls += 1;
    if (host !== "rebind.test") throw new Error(`unexpected host ${host}`);
    return { address: "127.0.0.1", family: 4 };
  };
  return { resolveHost, calls: () => calls };
}

test("the request connects to the vetted address without resolving again", async () => {
  seen.length = 0;
  const guard = vettedOnce();
  const res = await safeFetch(`http://rebind.test:${port}/page`, { resolveHost: guard.resolveHost, timeoutMs: 3000 });
  assert.equal(res.error, null);
  assert.equal(res.status, 200);
  assert.equal(res.text, "vetted page");
  assert.equal(guard.calls(), 1, "one vetting lookup per hop");
  assert.equal(seen.length, 1);
  assert.equal(seen[0].host, `rebind.test:${port}`, "Host header keeps the original name");
});

test("compressed bodies are decoded and headers stay readable", async () => {
  const guard = vettedOnce();
  const res = await safeFetch(`http://rebind.test:${port}/gzip`, { resolveHost: guard.resolveHost, timeoutMs: 3000 });
  assert.equal(res.text, "compressed page");
  assert.equal(res.headers.get("x-probe"), "yes");
  assert.match(seen.at(-1).encoding ?? "", /gzip/);
});
