import { ServiceInfoSchema, type ServiceInfo } from "@cdo/schemas";

export type ApiStatus = { ok: true; info: ServiceInfo } | { ok: false; reason: string };

/**
 * Asks the API who it is, and checks the answer against the same schema the
 * API used to build it. A response that doesn't match is reported, not trusted.
 */
export async function getServiceInfo(
  apiUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiStatus> {
  let response: Response;
  try {
    response = await fetchImpl(new URL("/meta", apiUrl), {
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
  } catch {
    return { ok: false, reason: "API unreachable" };
  }

  if (!response.ok) {
    return { ok: false, reason: `API responded with ${String(response.status)}` };
  }

  const parsed = ServiceInfoSchema.safeParse(await response.json());
  return parsed.success
    ? { ok: true, info: parsed.data }
    : { ok: false, reason: "API response does not match the shared contract" };
}
