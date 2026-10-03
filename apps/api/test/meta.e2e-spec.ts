import { ServiceInfoSchema } from "@cdo/schemas";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import { loadEnv } from "../src/config/env.js";

describe("GET /meta (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(loadEnv({ NODE_ENV: "test", APP_VERSION: "e2e" }))],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("responds 200 with a body matching the shared schema", async () => {
    const response = await request(app.getHttpServer()).get("/meta").expect(200);
    const parsed = ServiceInfoSchema.parse(response.body);
    expect(parsed.version).toBe("e2e");
  });
});
