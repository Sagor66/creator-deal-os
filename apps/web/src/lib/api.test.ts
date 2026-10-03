import { describe, expect, it } from "vitest";
import { getServiceInfo } from "./api";

const apiUrl = "http://api.test";
const validBody = {
  service: "creator-deal-os-api",
  version: "1.2.3",
  time: "2026-10-04T12:00:00.000Z",
};

function respondWith(body: unknown, status = 200): typeof fetch {
  return () => Promise.resolve(Response.json(body, { status }));
}

describe("getServiceInfo", () => {
  it("returns the parsed info when the API honours the contract", async () => {
    await expect(getServiceInfo(apiUrl, { fetchImpl: respondWith(validBody) })).resolves.toEqual({
      ok: true,
      info: validBody,
    });
  });

  it("rejects a response that breaks the shared contract", async () => {
    const result = await getServiceInfo(apiUrl, {
      fetchImpl: respondWith({ ...validBody, time: "not a date" }),
    });
    expect(result).toEqual({
      ok: false,
      reason: "API response does not match the shared contract",
    });
  });

  it("reports a non-2xx status", async () => {
    await expect(getServiceInfo(apiUrl, { fetchImpl: respondWith({}, 503) })).resolves.toEqual({
      ok: false,
      reason: "API responded with 503",
    });
  });

  it("reports an unreachable API instead of throwing", async () => {
    const failing: typeof fetch = () => Promise.reject(new TypeError("fetch failed"));
    await expect(getServiceInfo(apiUrl, { fetchImpl: failing })).resolves.toEqual({
      ok: false,
      reason: "API unreachable",
    });
  });

  it("forwards the request ID so the call can be traced in the API's logs", async () => {
    let sent: string | null = null;
    const capturing: typeof fetch = (_input, init) => {
      sent = new Headers(init?.headers).get("x-request-id");
      return Promise.resolve(Response.json(validBody));
    };
    await getServiceInfo(apiUrl, { requestId: "web-12345678", fetchImpl: capturing });
    expect(sent).toBe("web-12345678");
  });
});
