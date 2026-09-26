/**
 * lib.mjs — Shared helpers for setup.mjs / finalize.mjs / check-*.mjs
 *
 * - sanitizeSlug:        single source of truth for slug normalization
 * - resolveCampaignsDir: workspace-anchored campaigns/ resolution
 * - mutateStatus:        transactional read-modify-write of .status.json
 *                        guarded by a lock directory (parallel batches in
 *                        mc-orchestrate run several finalize processes at once)
 * - safeFetch:           SSRF-guarded fetch for scripts that hit external
 *                        URLs (check-site-signals.mjs, check-schema.mjs)
 */

import {
  readFileSync,
  writeFileSync,
  renameSync,
  mkdirSync,
  rmdirSync,
  statSync,
  existsSync,
} from "fs";
import { resolve, join, dirname } from "path";
import { lookup as dnsLookup } from "dns/promises";
import { BlockList, isIPv4, isIPv6 } from "net";
import { request as httpRequest } from "http";
import { request as httpsRequest } from "https";
import { createBrotliDecompress, createGunzip, createInflate } from "zlib";

export function sanitizeSlug(slug) {
  return String(slug)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_一-鿿]/g, "");
}

/**
 * Resolution order:
 *   1. MC_WORKSPACE env var (explicit override)
 *   2. cwd, if it already contains a campaigns/ dir (normal workspace run)
 *   3. script-relative ../campaigns, if it exists (legacy local-repo layout)
 *   4. cwd (fresh workspace — campaigns/ will be created here)
 */
export function resolveCampaignsDir(scriptDir) {
  if (process.env.MC_WORKSPACE) {
    return resolve(process.env.MC_WORKSPACE, "campaigns");
  }
  const cwdCampaigns = resolve(process.cwd(), "campaigns");
  if (existsSync(cwdCampaigns)) return cwdCampaigns;

  const scriptCampaigns = resolve(scriptDir, "..", "campaigns");
  if (existsSync(scriptCampaigns)) return scriptCampaigns;

  return cwdCampaigns;
}

const LOCK_STALE_MS = 30_000;
const LOCK_TIMEOUT_MS = 10_000;
const LOCK_RETRY_MS = 50;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function acquireLock(lockPath) {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  for (;;) {
    try {
      mkdirSync(lockPath);
      return;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      try {
        if (Date.now() - statSync(lockPath).mtimeMs > LOCK_STALE_MS) {
          rmdirSync(lockPath);
          continue;
        }
      } catch {
        continue; // lock vanished between checks — retry immediately
      }
      if (Date.now() > deadline) {
        throw new Error(`timed out waiting for status lock: ${lockPath}`);
      }
      await sleep(LOCK_RETRY_MS);
    }
  }
}

function releaseLock(lockPath) {
  try {
    rmdirSync(lockPath);
  } catch {
    // Non-fatal: stale-lock reclaim will clean up
  }
}

/**
 * Transactionally mutate campaigns/{slug}/.status.json.
 * `mutator(status)` receives the freshly-read status object and must return
 * the object to persist. Write is atomic (temp file + rename).
 */
export async function mutateStatus(campaignDir, mutator) {
  const statusPath = join(campaignDir, ".status.json");
  const lockPath = statusPath + ".lock";

  await acquireLock(lockPath);
  try {
    let status = {};
    if (existsSync(statusPath)) {
      try {
        status = JSON.parse(readFileSync(statusPath, "utf-8"));
      } catch {
        // Corrupt status file — reset
      }
    }
    status = mutator(status) ?? status;
    const tmpPath = statusPath + `.tmp-${process.pid}`;
    mkdirSync(dirname(statusPath), { recursive: true });
    writeFileSync(tmpPath, JSON.stringify(status, null, 2), "utf-8");
    renameSync(tmpPath, statusPath);
    return status;
  } finally {
    releaseLock(lockPath);
  }
}

// ── SSRF-guarded fetch ───────────────────────────────────────────────────────
//
// mc-seo's site-signal scripts fetch user-supplied URLs (robots.txt, sitemap,
// staging subdomains, page HTML for schema checks). A URL that resolves to a
// private/loopback address must not be fetched — otherwise "audit this URL"
// becomes a way to probe the internal network the script runs on.

// A bare "compatible; XSEO/1.0" UA gets challenge-blocked by most bot
// protection (Cloudflare, IMDb, npmjs all returned 202/403 in testing before
// this change). A standard browser UA string, self-identified via the
// trailing token, is what real audit tools use and is what gets a normal
// server-rendered response instead of a challenge page.
const DEFAULT_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 MarketerClawSEO/1.0",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
};

// IANA special-purpose ranges that must never be fetched. BlockList parses
// every IPv6 spelling and applies the IPv4 rules to IPv4-mapped addresses
// (::ffff:7f00:1 is 127.0.0.1), which hand-rolled prefix checks missed.
//
// 198.18.0.0/15 (benchmarking) is deliberately NOT blocked: Clash/Surge
// "fake-IP" proxies answer every DNS query from it and forward by hostname,
// so blocking it breaks every fetch for those users and protects nothing.
const BLOCKED_RANGES = new BlockList();
for (const [net, bits] of [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT (also Tailscale)
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, cloud metadata
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.88.99.0", 24], // 6to4 relay anycast
  ["192.168.0.0", 16], // private
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
]) BLOCKED_RANGES.addSubnet(net, bits, "ipv4");
for (const [net, bits] of [
  ["::", 96], // unspecified, loopback, IPv4-compatible
  ["64:ff9b::", 96], // NAT64 well-known prefix
  ["64:ff9b:1::", 48], // NAT64 local-use
  ["100::", 64], // discard-only
  ["2001::", 23], // IETF protocol assignments (Teredo, ORCHID, ...)
  ["2001:db8::", 32], // documentation
  ["2002::", 16], // 6to4
  ["fc00::", 7], // unique local
  ["fe80::", 10], // link-local
  ["fec0::", 10], // site-local (deprecated)
  ["ff00::", 8], // multicast
]) BLOCKED_RANGES.addSubnet(net, bits, "ipv6");

/** Exported for testing. Returns true if the given IP string must be blocked. */
export function isBlockedIp(ip) {
  if (isIPv4(ip)) return BLOCKED_RANGES.check(ip, "ipv4");
  if (isIPv6(ip)) return BLOCKED_RANGES.check(ip, "ipv6");
  return true; // unrecognized format — refuse rather than guess
}

/**
 * Resolve `hostname` and refuse if any of its addresses is private/loopback/
 * reserved — a resolver may hand back several records, so checking only the
 * first one is not enough. Returns the vetted `{ address, family }` that the
 * request must then connect to. Throws on refusal; callers report this as a
 * blocked fetch, not a generic network error, so it is never silently
 * swallowed into "not found". `lookup` is injectable for tests.
 */
export async function assertPublicHost(hostname, lookup = dnsLookup) {
  const bare = hostname.replace(/^\[(.*)\]$/, "$1"); // URL keeps IPv6 literals bracketed
  let records;
  try {
    records = await lookup(bare, { all: true });
  } catch (err) {
    throw new Error(`DNS lookup failed for ${hostname}: ${err.message}`);
  }
  const list = Array.isArray(records) ? records : [records];
  const blocked = list.find((r) => isBlockedIp(r.address));
  if (list.length === 0 || blocked) {
    throw new Error(`Blocked: ${hostname} resolves to a private/reserved address (${blocked?.address ?? "none"})`);
  }
  const { address, family } = list[0];
  return { address, family: family ?? (isIPv6(address) ? 6 : 4) };
}

export const MAX_REDIRECTS = 5;

/** Refuse anything but http(s) on a public host. Returns the URL and the vetted address. */
async function vetUrl(url, resolveHost) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { error: `Invalid URL: ${url}` };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: `Unsupported protocol: ${parsed.protocol}` };
  }
  try {
    return { parsed, pinned: await resolveHost(parsed.hostname) };
  } catch (err) {
    return { error: err.message };
  }
}

const MAX_BODY_BYTES = 5 * 1024 * 1024;

const fail = (error) => ({ ok: false, status: null, text: null, error });

const DECODERS = { gzip: createGunzip, "x-gzip": createGunzip, deflate: createInflate, br: createBrotliDecompress };

/**
 * One HTTP(S) request that connects to `pinned.address` instead of resolving
 * the hostname again — closing the window where DNS answers "public" to the
 * guard and "127.0.0.1" to the connection (DNS rebinding). The Host header,
 * TLS SNI and certificate check still use the original hostname.
 */
function requestPinned(url, pinned, signal, maxBytes) {
  const send = url.protocol === "https:" ? httpsRequest : httpRequest;
  const lookup = (_host, opts, cb) =>
    opts?.all ? cb(null, [pinned]) : cb(null, pinned.address, pinned.family);
  return new Promise((resolveResp, reject) => {
    const req = send(
      url,
      { headers: { ...DEFAULT_FETCH_HEADERS, "Accept-Encoding": "gzip, deflate, br" }, lookup, signal },
      (res) => {
        const status = res.statusCode;
        const headers = new Headers();
        for (const [name, value] of Object.entries(res.headers)) {
          for (const v of [].concat(value)) headers.append(name, v);
        }
        const decode = DECODERS[(res.headers["content-encoding"] ?? "").toLowerCase()];
        const body = decode ? res.pipe(decode()) : res;
        const readText = () =>
          new Promise((done, bad) => {
            const chunks = [];
            let size = 0;
            body.on("data", (c) => {
              size += c.length;
              if (size <= maxBytes) return chunks.push(c);
              body.destroy();
              res.destroy();
              bad(new Error(`Response body exceeds ${maxBytes} bytes`));
            });
            body.on("end", () => done(Buffer.concat(chunks).toString("utf8")));
            body.on("error", bad);
            res.on("error", bad);
          });
        resolveResp({ status, ok: status >= 200 && status < 300, headers, readText, discard: () => res.resume() });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

/**
 * SSRF-guarded fetch with a timeout. Every hop is vetted (http(s) only, every
 * DNS record public) and the connection is pinned to the vetted address.
 *
 * Redirects are followed here, not by the HTTP client: a public host could
 * answer 302 → http://127.0.0.1/… With redirect "follow" (the default) each
 * Location is vetted like the original URL, up to MAX_REDIRECTS hops;
 * "manual" returns the 3xx as-is; "error" fails on the first redirect.
 *
 * Returns { ok, status, text, error, headers } — never throws for ordinary
 * network failures (timeout, DNS, connection refused); those come back as
 * `{ ok: false, error }` so callers can render a "warn/error" row instead of
 * crashing the whole audit run. `resolveHost` is injectable for tests.
 * `maxBytes` caps the decoded body, so a huge page or a compression bomb
 * fails instead of filling memory.
 */
export async function safeFetch(
  url,
  { timeoutMs = 10_000, redirect = "follow", resolveHost = assertPublicHost, maxBytes = MAX_BODY_BYTES } = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let next = url;
    for (let hop = 0; ; hop++) {
      const { parsed, pinned, error } = await vetUrl(next, resolveHost);
      if (error) return fail(error);
      const resp = await requestPinned(parsed, pinned, controller.signal, maxBytes);
      const location = resp.headers.get("location");
      const isRedirect = resp.status >= 300 && resp.status < 400 && location;
      if (!isRedirect || redirect === "manual") {
        const text = await resp.readText();
        return { ok: resp.ok, status: resp.status, text, error: null, headers: resp.headers };
      }
      resp.discard();
      if (redirect === "error") return fail(`Redirected to ${location} (redirect: "error")`);
      if (hop >= MAX_REDIRECTS) return fail(`Too many redirects (> ${MAX_REDIRECTS})`);
      next = new URL(location, parsed).toString();
    }
  } catch (err) {
    return fail(err.name === "AbortError" ? `Timed out after ${timeoutMs}ms` : err.message);
  } finally {
    clearTimeout(timer);
  }
}
