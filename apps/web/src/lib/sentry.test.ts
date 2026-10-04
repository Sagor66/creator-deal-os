import { describe, expect, it } from "vitest";
import { parseClientConfig, sentryOptions, serializeClientConfig } from "./sentry";

const config = {
  dsn: "https://publickey@o1.ingest.de.sentry.io/2",
  environment: "staging",
  release: "d133ca1ce831",
} as const;

describe("client config round trip", () => {
  it("survives serialise → parse", () => {
    expect(parseClientConfig(serializeClientConfig(config))).toEqual(config);
  });

  it("can never close the surrounding script tag", () => {
    const hostile = { ...config, release: "</script><script>alert(1)</script>" };
    const json = serializeClientConfig(hostile);
    expect(json).not.toContain("<");
    expect(parseClientConfig(json)?.release).toBe(hostile.release);
  });

  it.each([null, "", "not json", JSON.stringify({ dsn: "x" })])(
    "treats %j as 'no reporting'",
    (input) => {
      expect(parseClientConfig(input)).toBeUndefined();
    },
  );
});

describe("sentryOptions", () => {
  const options = sentryOptions(config);

  it("tags release and environment and collects only allow-listed headers", () => {
    expect(options).toMatchObject({
      environment: "staging",
      release: "d133ca1ce831",
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpBodies: [],
        urlQueryParams: false,
        httpHeaders: { request: { allow: ["user-agent", "content-type", "x-request-id"] } },
      },
    });
  });

  it("scrubs events and breadcrumbs", () => {
    expect(options.beforeSend({ message: "for jane@example.com" })).toEqual({
      message: "for [email]",
    });
    expect(options.beforeBreadcrumb({ data: { url: "/deals?token=x" } })).toEqual({
      data: { url: "/deals" },
    });
  });
});
