import {
  ReadinessReportSchema,
  ServiceInfoSchema,
  type ReadinessReport,
  type ServiceInfo,
} from "@cdo/schemas";

export type ApiStatus = { ok: true; info: ServiceInfo } | { ok: false; reason: string };
export type ReadinessStatus = { ok: true; report: ReadinessReport } | { ok: false; reason: string };

interface RequestOptions {
  requestId?: string;
  fetchImpl?: typeof fetch;
}

/** GET from the API, or `undefined` when it can't be reached in time. */
async function get(
  apiUrl: string,
  path: string,
  { requestId, fetchImpl = fetch }: RequestOptions,
): Promise<Response | undefined> {
  try {
    return await fetchImpl(new URL(path, apiUrl), {
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
      // Lets one page view be followed into the API's logs.
      headers: requestId ? { "X-Request-Id": requestId } : {},
    });
  } catch {
    return undefined;
  }
}

/**
 * Asks the API who it is, and checks the answer against the same schema the
 * API used to build it. A response that doesn't match is reported, not trusted.
 */
export async function getServiceInfo(
  apiUrl: string,
  options: RequestOptions = {},
): Promise<ApiStatus> {
  const response = await get(apiUrl, "/meta", options);
  if (!response) return { ok: false, reason: "API unreachable" };
  if (!response.ok) {
    return { ok: false, reason: `API responded with ${String(response.status)}` };
  }

  const parsed = ServiceInfoSchema.safeParse(await response.json());
  return parsed.success
    ? { ok: true, info: parsed.data }
    : { ok: false, reason: "API response does not match the shared contract" };
}

/**
 * Asks the API whether it can serve traffic (`/health/ready`). A 503 still
 * carries a report saying which check is down, so 200 and 503 are both parsed.
 */
export async function getReadiness(
  apiUrl: string,
  options: RequestOptions = {},
): Promise<ReadinessStatus> {
  const response = await get(apiUrl, "/health/ready", options);
  if (!response) return { ok: false, reason: "API unreachable" };
  if (response.status !== 200 && response.status !== 503) {
    return { ok: false, reason: `API responded with ${String(response.status)}` };
  }

  const parsed = ReadinessReportSchema.safeParse(await response.json());
  return parsed.success
    ? { ok: true, report: parsed.data }
    : { ok: false, reason: "API response does not match the shared contract" };
}
