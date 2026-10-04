import { Controller, Get, Header, Res } from "@nestjs/common";
import type { Response } from "express";
import { ReadinessService, type ReadinessReport } from "./readiness.service.js";

@Controller("health")
export class HealthController {
  constructor(private readonly readiness: ReadinessService) {}

  /** Liveness: is the process up? Never checks dependencies. */
  @Get()
  @Header("Cache-Control", "no-store")
  live(): { status: "ok" } {
    return { status: "ok" };
  }

  /** Readiness: should this instance receive traffic right now? */
  @Get("ready")
  @Header("Cache-Control", "no-store")
  async ready(@Res({ passthrough: true }) response: Response): Promise<ReadinessReport> {
    const report = await this.readiness.check();
    response.status(report.status === "ready" ? 200 : 503);
    return report;
  }
}
