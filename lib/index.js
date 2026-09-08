// fakeip-compat v2: a real ctx.web fetch provider for two local realities:
//
//  1. TUN proxies (Mihomo/Clash, Fake-IP DNS): system resolution returns proxy
//     fake addresses, so the stock `http` provider's SSRF pre-check rejects
//     every public site. This provider re-validates via trusted DoH (direct
//     HTTPS to IP-literal endpoints, no shell) and, only then, transports to
//     the DoH-validated REAL addresses through a pinned Undici agent.
//  2. Pinned LAN debugging: a configured allowlist CIDR (default
//     192.168.0.0/16). System-resolved addresses inside the allowlist are
//     transported pinned, exactly like the stock provider pins public ones.
//
// Everything else (other private ranges, mixed/fake+real answer sets,
// hosts-pinned names outside the LAN, non-allowlisted literals) keeps the
// stock denial with the stock error codes.
//
// Design notes (why v1 broke DSH, and what changed):
//  - v1 assigned the shared fetch entrypoint directly (monkey-patch),
//    bypassing the provider registry, hiding from --dump-config, defeating
//    WEB_PROVIDER_AMBIGUOUS/WEB_DUPLICATE_PROVIDER, and leaves stale closures
//    on HMR reload. v2 calls ctx.web.registerFetchProvider() like every
//    official provider (see @deepseek-ai/dsh-web-fetch-http/src/index.ts).
//  - v1 shelled out to external download/lookup binaries through the shell
//    service with string interpolation, where the model-controlled URL could
//    inject commands (the old allowlist only blocked quotes/newlines).
//    v2 uses node:dns/promises + undici only: no shell, no string commands,
//    no sandbox load per fetch.
//  - v1 threw generic Errors, breaking timeout/cancel classification
//    (timeoutOf(signal,'WEB_FETCH_TIMEOUT')) and tool-web presentation. v2
//    throws WebError with the stock codes.
//  - v1 validated with DoH but transported through system Fake-IP DNS (two
//    resolvers: TOCTOU). v2 transports to the validated address set only.
import z from '@deepseek-ai/schemastery';
import { WebError } from '@deepseek-ai/dsh-web';
import { deadline, timeoutOf } from '@deepseek-ai/dsh-timeout';
import { lookup as systemLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';

/** Cordis plugin name used by loader diagnostics. */
export const name = 'fakeip-compat';

/** Hard dependency: the web seam must exist before this provider registers. */
export const inject = ['web'];

/** Stable provider id selected via `web.fetchProvider` / DSH_WEB_FETCH_PROVIDER. */
export const FAKEIP_FETCH_PROVIDER_ID = 'fakeip-http';

/** Default `User-Agent`: the official product agent, never a browser disguise. */
export const DEFAULT_USER_AGENT = 'deepseek-harness/0.0.1 (+https://github.com/deepseek-ai)';

const MAX_NODE_TIMER_DELAY_MS = 2147483647;

/** Plugin config: transport limits plus the two local-network exceptions. */
export const Config = z.object({
  maxResponseBytes: z.number().default(5000000),
  maxBodyChars: z.number().default(100000),
  timeoutMs: z.number().default(30000),
  maxRedirects: z.number().default(5),
  userAgent: z.string().default(DEFAULT_USER_AGENT),
  lanCidr: z.string().default('192.168.0.0/16'),
  fakeV4Cidr: z.string().default('198.18.0.0/16'),
  fakeV6Cidr: z.string().default('fdfe:dcba:9876::/48'),
  dohEndpoints: z.array(z.string()).default(['https://1.1.1.1/dns-query', 'https://8.8.8.8/resolve']),
  dohTimeoutMs: z.number().default(8000),
  lanInsecure: z.boolean().default(false),
});

function assertPositiveFinite(field, value) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`fakeip-compat: ${field} must be a positive finite number`);
  }
}

function assertTimeoutMs(value) {
  assertPositiveFinite('timeoutMs', value);
  if (value > MAX_NODE_TIMER_DELAY_MS) {
    throw new Error(`fakeip-compat: timeoutMs must be no greater than ${MAX_NODE_TIMER_DELAY_MS}`);
  }
}

function assertNonNegativeInteger(field, value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`fakeip-compat: ${field} must be a non-negative integer`);
  }
}

/** Settings namespace for the GUI Settings → 插件 → 插件配置 section. */
export const FAKEIP_COMPAT_SETTINGS_NAMESPACE = 'fakeip-compat';

/** Register the Fake-IP-aware fetch provider with `ctx.web`. */
export function apply(ctx, config) {
  const resolved = config;
  assertPositiveFinite('maxResponseBytes', resolved.maxResponseBytes);
  assertPositiveFinite('maxBodyChars', resolved.maxBodyChars);
  assertTimeoutMs(resolved.timeoutMs);
  assertNonNegativeInteger('maxRedirects', resolved.maxRedirects);
  assertPositiveFinite('dohTimeoutMs', resolved.dohTimeoutMs);
  // Bundle-time validation stays strict: a malformed composition entry fails
  // loud at boot instead of silently running half-configured.
  buildRuntime(resolved);
  let getRuntime = () => buildRuntime(resolved);
  // Optional settings section (same pattern as dsh-web-search-tavily): the
  // GUI form writes the user layer, setSource swaps the live getter, and an
  // invalid edit keeps the last good runtime instead of breaking fetches.
  // No hard dependency: headless contexts without a settings service simply
  // keep the composition entry.
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.installSection(ctx, FAKEIP_COMPAT_SETTINGS_NAMESPACE, Config, resolved, {
      setSource: (source) => {
        const previous = getRuntime;
        getRuntime = () => tryBuildRuntime(source(), previous());
      },
      onChange: () => {},
    });
  });
  ctx.web.registerFetchProvider(new FakeIpFetchProvider(() => getRuntime()));
}

/** Build a validated { limits, net } runtime; throws on invalid input. */
function buildRuntime(resolved) {
  let lanNets;
  let fakeNets;
  try {
    lanNets = [ipaddr.parseCIDR(resolved.lanCidr)];
  } catch (error) {
    throw new Error(`fakeip-compat: lanCidr is not a valid CIDR: ${resolved.lanCidr}`);
  }
  try {
    fakeNets = [ipaddr.parseCIDR(resolved.fakeV4Cidr), ipaddr.parseCIDR(resolved.fakeV6Cidr)];
  } catch (error) {
    throw new Error('fakeip-compat: fakeV4Cidr/fakeV6Cidr is not a valid CIDR');
  }
  return {
    limits: {
      maxResponseBytes: resolved.maxResponseBytes,
      maxBodyChars: resolved.maxBodyChars,
      timeoutMs: resolved.timeoutMs,
      maxRedirects: resolved.maxRedirects,
      userAgent: resolved.userAgent,
    },
    net: {
      lanNets,
      fakeNets,
      dohEndpoints: resolved.dohEndpoints,
      dohTimeoutMs: resolved.dohTimeoutMs,
      lanInsecure: resolved.lanInsecure,
    },
  };
}

/**
 * Rebuild the runtime from a live settings edit, keeping the previous value
 * for every field that is missing or invalid (never throws: the settings
 * form must not be able to break in-flight fetches).
 */
function tryBuildRuntime(patch, fallback) {
  const prevLimits = fallback.limits;
  const prevNet = fallback.net;
  const num = (v, prev, max) => (
    Number.isFinite(v) && v > 0 && (max === undefined || v <= max) ? v : prev
  );
  const cidr = (v, prev) => {
    if (typeof v !== 'string') return prev;
    try {
      return [ipaddr.parseCIDR(v)];
    } catch {
      return prev;
    }
  };
  let fakeNets = prevNet.fakeNets;
  let fakeOk = true;
  for (const [key, idx] of [['fakeV4Cidr', 0], ['fakeV6Cidr', 1]]) {
    const v = patch[key];
    if (typeof v !== 'string') continue;
    try {
      fakeNets = fakeNets.slice();
      fakeNets[idx] = ipaddr.parseCIDR(v);
    } catch {
      fakeOk = false;
    }
  }
  if (!fakeOk) fakeNets = prevNet.fakeNets;
  const dohEndpoints = Array.isArray(patch.dohEndpoints) && patch.dohEndpoints.length > 0
    && patch.dohEndpoints.every((e) => typeof e === 'string' && e.length > 0)
    ? patch.dohEndpoints.slice()
    : prevNet.dohEndpoints;
  return {
    limits: {
      maxResponseBytes: num(patch.maxResponseBytes, prevLimits.maxResponseBytes),
      maxBodyChars: num(patch.maxBodyChars, prevLimits.maxBodyChars),
      timeoutMs: num(patch.timeoutMs, prevLimits.timeoutMs, MAX_NODE_TIMER_DELAY_MS),
      maxRedirects: Number.isInteger(patch.maxRedirects) && patch.maxRedirects >= 0
        ? patch.maxRedirects
        : prevLimits.maxRedirects,
      userAgent: typeof patch.userAgent === 'string' && patch.userAgent.length > 0
        ? patch.userAgent
        : prevLimits.userAgent,
    },
    net: {
      lanNets: cidr(patch.lanCidr, prevNet.lanNets),
      fakeNets,
      dohEndpoints,
      dohTimeoutMs: num(patch.dohTimeoutMs, prevNet.dohTimeoutMs),
      lanInsecure: typeof patch.lanInsecure === 'boolean' ? patch.lanInsecure : prevNet.lanInsecure,
    },
  };
}

// ---------------------------------------------------------------------------
// Address classification (stock semantics + two explicit exceptions)
// ---------------------------------------------------------------------------

/** Stock public-unicast check, verbatim from web-fetch-http/network.ts. */
function isPublicIpAddress(input) {
  let parsed;
  try {
    parsed = ipaddr.parse(stripIpv6Brackets(input));
  } catch {
    return false;
  }
  if (parsed instanceof ipaddr.IPv4) return parsed.range() === 'unicast';
  if (parsed.isIPv4MappedAddress()) return parsed.toIPv4Address().range() === 'unicast';
  return parsed.range() === 'unicast';
}

function matchAnyCidr(input, nets) {
  let parsed;
  try {
    parsed = ipaddr.parse(stripIpv6Brackets(input));
  } catch {
    return false;
  }
  for (const [net, bits] of nets) {
    try {
      if (parsed.kind() === net.kind() && parsed.match(net, bits)) return true;
    } catch {
      // kind mismatch or malformed entry: not a match.
    }
  }
  return false;
}

function stripIpv6Brackets(hostname) {
  return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
}

// ---------------------------------------------------------------------------
// Subprocess-free network layer (DoH over undici, pinned transport)
// ---------------------------------------------------------------------------

/** Race a non-cancellable OS lookup without letting it delay cancellation. */
function raceWithSignal(promise, signal) {
  const abortError = () => new Error('web fetch aborted during hostname resolution', { cause: signal.reason });
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const abort = () => { reject(abortError()); };
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', abort);
    });
  });
}

/** Combine the caller signal with a per-operation timeout where supported. */
function combinedSignal(signal, timeoutMs) {
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
  }
  return signal;
}

/**
 * Build the connector lookup that serves a fixed validated answer set.
 * Verbatim contract from web-fetch-http/network.ts: no network resolution.
 */
function createPinnedLookup(addresses) {
  return (hostname, options, callback) => {
    const family = typeof options.family === 'number'
      ? options.family
      : options.family === 'IPv4' ? 4 : options.family === 'IPv6' ? 6 : 0;
    const eligible = family === 0 ? addresses : addresses.filter((address) => address.family === family);
    const selected = eligible[0];
    if (selected === undefined) {
      callback(Object.assign(new Error(`no validated address for ${hostname} in family ${family}`), {
        code: 'ENOTFOUND',
        hostname,
      }), options.all === true ? [] : '', family);
      return;
    }
    if (options.all === true) {
      callback(null, eligible.map((address) => ({ ...address })));
      return;
    }
    callback(null, selected.address, selected.family);
  };
}

/**
 * Fetch through an Undici agent whose lookup returns only the validated set.
 * Same contract as web-fetch-http/network.ts requestPinned, plus an opt-in
 * `rejectUnauthorized: false` confined to the LAN path (default off).
 */
async function requestPinned(url, addresses, headers, signal, insecure) {
  const { Agent, fetch } = await import('undici');
  const dispatcher = insecure === true
    ? new Agent({ autoSelectFamily: true, connect: { lookup: createPinnedLookup(addresses), rejectUnauthorized: false } })
    : new Agent({ autoSelectFamily: true, connect: { lookup: createPinnedLookup(addresses) } });
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      headers,
      signal,
      dispatcher,
    });
    return { response, close: async () => { await dispatcher.close(); } };
  } catch (error) {
    await dispatcher.close();
    throw error;
  }
}

function collectDohAnswers(text, wantA) {
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    return null;
  }
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.Answer)) return [];
  const out = [];
  for (const a of doc.Answer) {
    if (!a || typeof a !== 'object' || typeof a.data !== 'string') continue;
    if (wantA && a.type !== 1) continue;
    if (!wantA && a.type !== 28) continue;
    out.push(a.data);
  }
  return out;
}

/**
 * Resolve via trusted DoH endpoints (direct HTTPS to IP literals, no system
 * DNS, no shell). Both endpoints are tried; the first fully-successful one
 * wins. Transport failures fall through to the next endpoint; a negative
 * (non-public) answer is authoritative and throws immediately.
 */
async function dohResolve(hostname, signal, net) {
  const { fetch } = await import('undici');
  let transportFailed = 0;
  for (const base of net.dohEndpoints) {
    let addrs = [];
    let ok = false;
    for (const t of ['A', 'AAAA']) {
      const url = `${base}?name=${encodeURIComponent(hostname)}&type=${t}`;
      let res;
      try {
        res = await fetch(url, {
          method: 'GET',
          redirect: 'manual',
          headers: { accept: 'application/dns-json' },
          signal: combinedSignal(signal, net.dohTimeoutMs),
        });
      } catch {
        ok = false;
        break;
      }
      if (res.status !== 200) {
        try { await res.body?.cancel(); } catch { /* best-effort cleanup */ }
        ok = false;
        break;
      }
      let text;
      try {
        text = await res.text();
      } catch {
        ok = false;
        break;
      }
      const got = collectDohAnswers(text, t === 'A');
      if (got === null) {
        ok = false;
        break;
      }
      ok = true;
      addrs = addrs.concat(got);
    }
    if (!ok) {
      transportFailed += 1;
      continue;
    }
    // Authoritative answer from this endpoint: every address must be public.
    for (const a of addrs) {
      if (!isPublicIpAddress(a)) {
        throw new WebError(
          `URL hostname "${hostname}" resolves via trusted DNS to a non-public IP address`,
          'WEB_BLOCKED_URL',
        );
      }
    }
    return addrs;
  }
  throw new WebError(
    `trusted DNS validation unavailable for "${hostname}" (${transportFailed} endpoint(s) failed)`,
    'WEB_PROVIDER_ERROR',
  );
}

/**
 * Fake-IP-aware resolver. Strict superset of the stock resolver:
 *  - all-public system answers -> returned directly (no TUN involved);
 *  - all-LAN system answers -> returned for the pinned LAN path;
 *  - all-fake system answers -> DoH-validated real addresses (TUN path);
 *  - anything else (mixed sets, other-private, literals outside the LAN)
 *    -> WEB_BLOCKED_URL, exactly like stock.
 * A hosts-file pin to a private/LAN address surfaces here as a non-fake
 * system answer and is therefore respected, never DoH-bypassed.
 */
async function resolveFakeIpAware(hostname, signal, net) {
  const unbracketed = stripIpv6Brackets(hostname);
  const literalFamily = isIP(unbracketed);
  if (literalFamily !== 0) {
    // IP literals: only the LAN allowlist is an exception; fake-pool
    // literals and every other non-public literal stay blocked.
    if (matchAnyCidr(unbracketed, net.lanNets)) {
      return { addresses: [{ address: unbracketed, family: literalFamily }], path: 'lan' };
    }
    throw new WebError(
      `URL hostname "${hostname}" resolves to a non-public IP address`,
      'WEB_BLOCKED_URL',
    );
  }
  const resolved = await raceWithSignal(
    systemLookup(unbracketed, { all: true, order: 'verbatim' }),
    signal,
  );
  if (resolved.length === 0) {
    throw new WebError(`hostname "${hostname}" resolved to no addresses`, 'WEB_PROVIDER_ERROR');
  }
  for (const entry of resolved) {
    if ((entry.family !== 4 && entry.family !== 6) || isIP(entry.address) !== entry.family) {
      throw new WebError(`hostname "${hostname}" resolved to an invalid IP address`, 'WEB_PROVIDER_ERROR');
    }
  }
  if (resolved.every((entry) => isPublicIpAddress(entry.address))) {
    return {
      addresses: resolved.map((entry) => ({ address: entry.address, family: entry.family })),
      path: 'direct',
    };
  }
  if (resolved.every((entry) => matchAnyCidr(entry.address, net.lanNets))) {
    return {
      addresses: resolved.map((entry) => ({ address: entry.address, family: entry.family })),
      path: 'lan',
    };
  }
  if (resolved.every((entry) => matchAnyCidr(entry.address, net.fakeNets))) {
    const real = await dohResolve(hostname, signal, net);
    if (real.length === 0) {
      throw new WebError(`hostname "${hostname}" resolved to no addresses`, 'WEB_BLOCKED_URL');
    }
    return {
      addresses: real.map((address) => ({ address, family: isIP(address) })),
      path: 'tun',
    };
  }
  throw new WebError(
    `URL hostname "${hostname}" resolves to a non-public IP address`,
    'WEB_BLOCKED_URL',
  );
}

// ---------------------------------------------------------------------------
// URL policy + body handling (same semantics as web-fetch-http)
// ---------------------------------------------------------------------------

const WEB_FETCH_MAX_URL_LENGTH = 2048;

function parseFetchUrl(input) {
  let url;
  try {
    url = new URL(input);
  } catch (error) {
    throw new WebError(`invalid URL: ${input}`, 'WEB_INVALID_URL', { cause: error });
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new WebError(`unsupported URL scheme "${url.protocol}" (only http and https are allowed)`, 'WEB_INVALID_URL');
  }
  if (url.username.length > 0 || url.password.length > 0) {
    throw new WebError('credentials in URLs are not allowed', 'WEB_BLOCKED_URL');
  }
  return url;
}

function validateFetchUrl(input) {
  if (input.length > WEB_FETCH_MAX_URL_LENGTH) {
    throw new WebError(`URL exceeds the maximum length of ${WEB_FETCH_MAX_URL_LENGTH}`, 'WEB_INVALID_URL');
  }
  return parseFetchUrl(input);
}

function isSameOrigin(a, b) {
  return a.protocol === b.protocol && a.hostname === b.hostname && a.port === b.port;
}

function classifyContentType(contentType) {
  const mime = (contentType ?? '').replace(/;.*$/s, '').trim().toLowerCase();
  if (mime === 'text/html' || mime === 'application/xhtml+xml') return 'html';
  if (mime.startsWith('text/')) return 'text';
  if (mime === 'application/json' || mime === 'application/xml' || mime.endsWith('+json') || mime.endsWith('+xml')) return 'text';
  return undefined;
}

function parseCharset(contentType) {
  return /;\s*charset\s*=\s*"?([^";]+)"?/i.exec(contentType ?? '')?.[1]?.trim().toLowerCase();
}

function decoderForCharset(charset) {
  if (charset === undefined) return new TextDecoder('utf-8');
  try {
    return new TextDecoder(charset);
  } catch (error) {
    throw new WebError(`unsupported charset "${charset}"`, 'WEB_UNSUPPORTED_CONTENT_TYPE', { cause: error });
  }
}

function isRedirectStatus(status) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function resolveRedirect(location, base) {
  try {
    return new URL(location, base);
  } catch (error) {
    throw new WebError(`invalid redirect Location "${location}"`, 'WEB_PROVIDER_ERROR', { cause: error });
  }
}

/**
 * Classify transport failures exactly like the stock provider: our own
 * deadline firing -> WEB_FETCH_TIMEOUT; any other abort -> WEB_ABORTED;
 * anything else -> WEB_PROVIDER_ERROR.
 */
function translateAbortOrNetwork(error, signal) {
  const timeout = timeoutOf(signal, 'WEB_FETCH_TIMEOUT');
  if (timeout !== undefined) return new WebError('web fetch timed out', 'WEB_FETCH_TIMEOUT', { cause: timeout });
  if (signal.aborted) return new WebError('web fetch aborted', 'WEB_ABORTED', { cause: error });
  return new WebError(`web fetch failed: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error });
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class FakeIpFetchProvider {
  constructor(getRuntime) {
    this.getRuntime = getRuntime;
  }

  get id() {
    return FAKEIP_FETCH_PROVIDER_ID;
  }

  /** No credentials to check; select explicitly via `web.fetchProvider`. */
  available() {
    return true;
  }

  async fetch(request, signal) {
    if (signal?.aborted) throw new WebError('web fetch aborted', 'WEB_ABORTED');
    const { limits } = this.getRuntime();
    const d = deadline(signal, limits.timeoutMs, 'WEB_FETCH_TIMEOUT');
    try {
      return await this.followAndRead(request.url, d.signal);
    } finally {
      d[Symbol.dispose]();
    }
  }

  async followAndRead(initialUrl, signal) {
    const { limits } = this.getRuntime();
    let currentUrl = validateFetchUrl(initialUrl);
    let redirectsFollowed = 0;
    for (;;) {
      const req = await this.requestOnce(currentUrl, signal);
      const { response } = req;
      try {
        if (isRedirectStatus(response.status)) {
          if (redirectsFollowed >= limits.maxRedirects) {
            await response.body?.cancel();
            throw new WebError(`exceeded the maximum of ${limits.maxRedirects} redirects`, 'WEB_REDIRECT_BLOCKED');
          }
          const location = response.headers.get('location');
          if (location === null) {
            await response.body?.cancel();
            throw new WebError(`redirect response (HTTP ${response.status}) without a Location header`, 'WEB_PROVIDER_ERROR');
          }
          const target = resolveRedirect(location, currentUrl);
          let validatedTarget;
          try {
            validatedTarget = validateFetchUrl(target.toString());
            if (!isSameOrigin(validatedTarget, currentUrl)) {
              throw new WebError(
                `cross-origin redirect to ${validatedTarget.origin} is not followed automatically; retry against that URL directly`,
                'WEB_REDIRECT_BLOCKED',
              );
            }
          } catch (error) {
            await response.body?.cancel();
            throw error;
          }
          await response.body?.cancel();
          currentUrl = validatedTarget;
          redirectsFollowed += 1;
          continue;
        }
        return await this.readBody(response, currentUrl, signal);
      } finally {
        await req.close();
      }
    }
  }

  async requestOnce(url, signal) {
    const { limits, net } = this.getRuntime();
    try {
      const { addresses, path } = await resolveFakeIpAware(url.hostname, signal, net);
      return await requestPinned(url, addresses, {
        'user-agent': limits.userAgent,
        accept: 'text/html,application/xhtml+xml,text/*;q=0.9,application/json;q=0.8',
      }, signal, path === 'lan' && net.lanInsecure === true);
    } catch (error) {
      if (error instanceof WebError) throw error;
      throw translateAbortOrNetwork(error, signal);
    }
  }

  async readBody(response, finalUrl, signal) {
    const { limits } = this.getRuntime();
    const contentType = response.headers.get('content-type');
    const kind = classifyContentType(contentType);
    if (kind === undefined) {
      await response.body?.cancel();
      throw new WebError(`unsupported content type "${contentType ?? 'unknown'}"`, 'WEB_UNSUPPORTED_CONTENT_TYPE');
    }
    let decoder;
    try {
      decoder = decoderForCharset(parseCharset(contentType));
    } catch (error) {
      await response.body?.cancel();
      throw error;
    }
    const { bytes, truncatedByBytes } = await this.readCapped(response, signal);
    const decoded = decoder.decode(bytes);
    const truncatedByChars = decoded.length > limits.maxBodyChars;
    const content = truncatedByChars ? decoded.slice(0, limits.maxBodyChars) : decoded;
    const body = kind === 'html' ? { kind: 'html', content } : { kind: 'text', content };
    return {
      url: finalUrl.toString(),
      statusCode: response.status,
      body,
      truncated: truncatedByBytes || truncatedByChars,
    };
  }

  async readCapped(response, signal) {
    const { limits } = this.getRuntime();
    const declared = response.headers.get('content-length');
    if (declared !== null) {
      const length = Number(declared);
      if (Number.isFinite(length) && length > limits.maxResponseBytes) {
        await response.body?.cancel();
        throw new WebError(`response exceeds the maximum of ${limits.maxResponseBytes} bytes`, 'WEB_FETCH_TOO_LARGE');
      }
    }
    if (response.body === null) return { bytes: new Uint8Array(0), truncatedByBytes: false };
    const chunks = [];
    let total = 0;
    let truncatedByBytes = false;
    const reader = response.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const remaining = limits.maxResponseBytes - total;
        if (value.byteLength > remaining) {
          chunks.push(value.subarray(0, remaining));
          total += remaining;
          truncatedByBytes = true;
          break;
        }
        chunks.push(value);
        total += value.byteLength;
      }
    } catch (error) {
      throw translateAbortOrNetwork(error, signal);
    } finally {
      await reader.cancel().catch(() => {});
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { bytes, truncatedByBytes };
  }
}
