import { Inject, Injectable } from "@nestjs/common";
import { LOGGER, type AppLogger } from "../logging/logger.js";
import { ShutdownService } from "../shutdown/shutdown.service.js";
import { CHECK_TIMEOUT_MS, HEALTH_INDICATORS, type HealthIndicator } from "./health-indicator.js";

export type CheckResult =
  { status: "up"; durationMs: number } | { status: "down"; durationMs: number; error: string };

export interface ReadinessReport {
  status: "ready" | "not_ready" | "shutting_down";
  checks: Record<string, CheckResult>;
}

class CheckTimeoutError extends Error {
  readonly code = "timeout";
}

function withTimeout(promise: Promise<void>, ms: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new CheckTimeoutError(`timed out after ${String(ms)}ms`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}

/** A short, safe code for the public body; full errors stay in the logs. */
function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = error.code;
    if (typeof code === "string" && /^[A-Za-z0-9_]{1,64}$/.test(code)) return code;
  }
  return "error";
}

@Injectable()
export class ReadinessService {
  constructor(
    @Inject(HEALTH_INDICATORS) private readonly indicators: readonly HealthIndicator[],
    @Inject(LOGGER) private readonly logger: AppLogger,
    private readonly shutdown: ShutdownService,
  ) {}

  async check(): Promise<ReadinessReport> {
    if (this.shutdown.isShuttingDown) return { status: "shutting_down", checks: {} };

    const results = await Promise.all(
      this.indicators.map(
        async (indicator) => [indicator.name, await this.run(indicator)] as const,
      ),
    );
    const ready = results.every(([, result]) => result.status === "up");
    return { status: ready ? "ready" : "not_ready", checks: Object.fromEntries(results) };
  }

  private async run(indicator: HealthIndicator): Promise<CheckResult> {
    const startedAt = performance.now();
    const elapsed = () => Math.round(performance.now() - startedAt);
    try {
      await withTimeout(indicator.check(), CHECK_TIMEOUT_MS);
      return { status: "up", durationMs: elapsed() };
    } catch (error) {
      this.logger.warn({ err: error, check: indicator.name }, "readiness check failed");
      return { status: "down", durationMs: elapsed(), error: errorCode(error) };
    }
  }
}
