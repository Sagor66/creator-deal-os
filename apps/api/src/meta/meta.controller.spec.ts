import { ServiceInfoSchema } from "@cdo/schemas";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { ENV, type Env } from "../config/env.js";
import { MetaController } from "./meta.controller.js";

describe("MetaController", () => {
  let controller: MetaController;

  beforeEach(async () => {
    const env: Env = { NODE_ENV: "test", PORT: 0, APP_VERSION: "1.2.3" };
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
