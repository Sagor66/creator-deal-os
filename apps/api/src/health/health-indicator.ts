/** One dependency readiness depends on. Redis adds itself here later. */
export interface HealthIndicator {
  readonly name: string;
  /** Resolves when healthy; rejects (ideally with an error carrying a `code`) when not. */
  check(): Promise<void>;
}

/** DI token for the list of indicators readiness runs. */
export const HEALTH_INDICATORS = Symbol("HEALTH_INDICATORS");

/** Per-check cap, so /health/ready always answers within a second. */
export const CHECK_TIMEOUT_MS = 500;
