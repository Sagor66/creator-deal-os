import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env.schema";

describe("parseServerEnv", () => {
  it("defaults API_URL for local development", () => {
    expect(parseServerEnv({})).toEqual({ API_URL: "http://localhost:3001" });
    expect(parseServerEnv({ API_URL: "" })).toEqual({ API_URL: "http://localhost:3001" });
  });

  it("accepts a valid URL", () => {
    expect(parseServerEnv({ API_URL: "https://api.example.com" }).API_URL).toBe(
      "https://api.example.com",
    );
  });

  it("rejects something that is not a URL", () => {
    expect(() => parseServerEnv({ API_URL: "not a url" })).toThrow();
  });
});
