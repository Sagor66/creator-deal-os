import { ServiceInfoSchema } from "@cdo/schemas";
import request from "supertest";
import type { App } from "supertest/types.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, type TestApp } from "./support/test-app.js";

describe("GET /meta (e2e)", () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ env: { APP_VERSION: "e2e" } });
  });

  afterAll(async () => {
    await t.app.close();
  });

  it("responds 200 with a body matching the shared schema", async () => {
    const response = await request(t.app.getHttpServer() as App)
      .get("/meta")
      .expect(200);
    expect(ServiceInfoSchema.parse(response.body).version).toBe("e2e");
  });
});
