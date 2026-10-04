import { describe, expect, it } from "vitest";
import { scrubBreadcrumb, scrubEvent, stripQuery } from "./scrub.js";

/** Shaped like a real Sentry error event from a server request. */
function realisticEvent() {
  return {
    event_id: "3acd7172c2934a8a8f6836ae12c6aeb4",
    environment: "production",
    release: "d133ca1ce831",
    exception: {
      values: [
        {
          type: "Error",
          value: "Duplicate entry 'jane@example.com' for key 'users.email'",
          stacktrace: { frames: [{ filename: "dist/deals/deals.service.js", lineno: 42 }] },
        },
      ],
    },
    request: {
      method: "POST",
      url: "https://api.example.app/invoices/9?token=abc123&email=jane@example.com",
      query_string: "token=abc123",
      cookies: { sid: "s3cret" },
      data: { iban: "DE89 3704 0044 0532 0130 00", note: "pay me" },
      env: { REMOTE_ADDR: "203.0.113.7" },
      headers: {
        "User-Agent": "Mozilla/5.0",
        Authorization: "Bearer eyJhbGci",
        Cookie: "sid=s3cret",
        "X-Request-Id": "web-123",
        "X-Forwarded-For": "203.0.113.7",
      },
    },
    user: { id: "user_42", email: "jane@example.com", ip_address: "203.0.113.7", username: "jane" },
    extra: { databaseUrl: "mysql://app:pw@db/x", password: "hunter2", attempt: 3 },
    breadcrumbs: [
      { category: "fetch", data: { url: "https://api.example.app/me?session=xyz", method: "GET" } },
      { category: "console", message: "sending receipt to jane@example.com" },
    ],
    tags: { route: "/invoices/:id" },
  };
}

describe("scrubEvent", () => {
  const scrubbed = scrubEvent(realisticEvent());

  it("drops request bodies, cookies, query strings and server env", () => {
    expect(scrubbed.request).not.toHaveProperty("data");
    expect(scrubbed.request).not.toHaveProperty("cookies");
    expect(scrubbed.request).not.toHaveProperty("query_string");
    expect(scrubbed.request).not.toHaveProperty("env");
    expect(scrubbed.request.url).toBe("https://api.example.app/invoices/9");
  });

  it("keeps only allow-listed headers", () => {
    expect(scrubbed.request.headers).toEqual({
      "User-Agent": "Mozilla/5.0",
      "X-Request-Id": "web-123",
    });
  });

  it("keeps only the user's pseudonymous id", () => {
    expect(scrubbed.user).toEqual({ id: "user_42" });
    expect(scrubEvent({ user: { email: "a@b.co" } })).not.toHaveProperty("user");
  });

  it("filters sensitive keys wherever they appear", () => {
    expect(scrubbed.extra).toEqual({
      databaseUrl: "[Filtered]",
      password: "[Filtered]",
      attempt: 3,
    });
  });

  it("replaces email addresses inside any string, including exception messages", () => {
    expect(scrubbed.exception.values[0]?.value).toBe(
      "Duplicate entry '[email]' for key 'users.email'",
    );
    expect(scrubbed.breadcrumbs[1]?.message).toBe("sending receipt to [email]");
  });

  it("strips query strings from breadcrumb URLs", () => {
    expect(scrubbed.breadcrumbs[0]?.data).toEqual({
      url: "https://api.example.app/me",
      method: "GET",
    });
  });

  it("leaves what debugging needs untouched", () => {
    expect(scrubbed.release).toBe("d133ca1ce831");
    expect(scrubbed.environment).toBe("production");
    expect(scrubbed.tags).toEqual({ route: "/invoices/:id" });
    expect(scrubbed.exception.values[0]?.stacktrace.frames[0]).toEqual({
      filename: "dist/deals/deals.service.js",
      lineno: 42,
    });
  });

  it("never mutates the event it was given", () => {
    const original = realisticEvent();
    scrubEvent(original);
    expect(original).toEqual(realisticEvent());
  });
});

describe("scrubBreadcrumb", () => {
  it("strips the query from navigation and fetch URLs and filters sensitive data", () => {
    expect(
      scrubBreadcrumb({
        category: "navigation",
        data: { from: "/login?next=/deals", to: "/deals?token=x" },
      }),
    ).toEqual({ category: "navigation", data: { from: "/login", to: "/deals" } });
    expect(scrubBreadcrumb({ data: { url: "/x", apiKey: "k" } })).toEqual({
      data: { url: "/x", apiKey: "[Filtered]" },
    });
  });
});

describe("stripQuery", () => {
  it.each([
    ["https://x.app/a?b=1", "https://x.app/a"],
    ["/a#frag", "/a"],
    ["/a", "/a"],
  ])("%s → %s", (input, expected) => {
    expect(stripQuery(input)).toBe(expected);
  });
});
