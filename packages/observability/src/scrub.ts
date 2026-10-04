/**
 * Removes personal data and secrets from error-tracker payloads before they
 * leave the process (docs/design/observability.md §4). Used as Sentry's
 * `beforeSend` / `beforeBreadcrumb` by the api, the web server and the browser.
 *
 * Structural on purpose (no Sentry types): it works on any event-shaped object,
 * returns a scrubbed copy, and never mutates its input.
 */

const FILTERED = "[Filtered]";

/** Keys whose values are never sent, wherever they appear. */
const SENSITIVE_KEY =
  /pass(?:word|wd)?|secret|token|authorization|cookie|session|api[-_]?key|credential|private[-_]?key|dsn|database[-_]?url/i;

/** Emails anywhere in a string: messages, breadcrumbs, even MySQL's duplicate-key errors. */
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Request headers worth keeping for debugging; everything else is dropped. */
const ALLOWED_HEADERS = new Set(["user-agent", "content-type", "x-request-id"]);

/** URL-valued fields that may carry tokens or personal data in a query string. */
const URL_FIELDS = ["url", "to", "from"] as const;

const MAX_DEPTH = 12;

type Dict = Record<string, unknown>;

function isDict(value: unknown): value is Dict {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Drops `?query` and `#fragment`: tokens and IDs travel there. */
export function stripQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

function scrubValue(value: unknown, depth: number): unknown {
  if (typeof value === "string") return value.replace(EMAIL, "[email]");
  if (depth >= MAX_DEPTH || typeof value !== "object" || value === null) return value;
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1));
  const out: Dict = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY.test(key) ? FILTERED : scrubValue(item, depth + 1);
  }
  return out;
}

function stripUrlFields(data: unknown): void {
  if (!isDict(data)) return;
  for (const field of URL_FIELDS) {
    const value = data[field];
    if (typeof value === "string") data[field] = stripQuery(value);
  }
}

function scrubRequest(request: unknown): void {
  if (!isDict(request)) return;
  // Bodies, cookies, query strings and server env are where personal data and tokens live.
  delete request["cookies"];
  delete request["data"];
  delete request["query_string"];
  delete request["env"];
  if (typeof request["url"] === "string") request["url"] = stripQuery(request["url"]);
  const headers = request["headers"];
  if (isDict(headers)) {
    request["headers"] = Object.fromEntries(
      Object.entries(headers).filter(([name]) => ALLOWED_HEADERS.has(name.toLowerCase())),
    );
  }
}

/** A scrubbed copy of an error event. */
export function scrubEvent<T extends object>(event: T): T {
  const copy = scrubValue(event, 0) as Dict;

  scrubRequest(copy["request"]);

  // Keep only a pseudonymous ID; never email, IP or username.
  const user = copy["user"];
  if (isDict(user)) {
    if (user["id"] === undefined) delete copy["user"];
    else copy["user"] = { id: user["id"] };
  }

  const breadcrumbs = copy["breadcrumbs"];
  if (Array.isArray(breadcrumbs)) {
    for (const crumb of breadcrumbs) if (isDict(crumb)) stripUrlFields(crumb["data"]);
  }

  return copy as T;
}

/** A scrubbed copy of a breadcrumb (navigation, fetch/XHR, console). */
export function scrubBreadcrumb<T extends object>(breadcrumb: T): T {
  const copy = scrubValue(breadcrumb, 0) as Dict;
  stripUrlFields(copy["data"]);
  return copy as T;
}
