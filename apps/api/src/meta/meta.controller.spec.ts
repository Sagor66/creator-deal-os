import { ServiceInfoSchema } from "@cdo/schemas";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { ENV, loadEnv } from "../config/env.js";
import { MetaController } from "./meta.controller.js";

describe("MetaController", () => {
  let controller: MetaController;

  beforeEach(async () => {
    const env = loadEnv({
      NODE_ENV: "test",
      APP_VERSION: "1.2.3",
      DATABASE_URL: "mysql://test:test@127.0.0.1:3306/test",
    });
    const moduleRef = await Test.createTestingModule({
      controllers: [MetaController],
      providers: [{ provide: ENV, useValue: env }],
    }).compile();
    controller = moduleRef.get(MetaController);
  });

  it("reports the service name and the configured version", () => {
    const info = controller.getInfo();
    expect(info.service).toBe("creator-deal-os-api");
    expect(info.version).toBe("1.2.3");
  });

  it("returns a payload that satisfies the shared contract", () => {
    expect(ServiceInfoSchema.safeParse(controller.getInfo()).success).toBe(true);
  });
});
