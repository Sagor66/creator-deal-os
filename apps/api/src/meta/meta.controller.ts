import { ServiceInfoSchema, type ServiceInfo } from "@cdo/schemas";
import { Controller, Get, Inject } from "@nestjs/common";
import { ENV, type Env } from "../config/env.js";

@Controller("meta")
export class MetaController {
  constructor(@Inject(ENV) private readonly env: Env) {}

  @Get()
  getInfo(): ServiceInfo {
    // Parse our own response with the shared contract: if the API ever drifts
    // from it, this throws in our tests rather than surprising the web app.
    return ServiceInfoSchema.parse({
      service: "creator-deal-os-api",
      version: this.env.APP_VERSION,
      time: new Date().toISOString(),
    });
  }
}
