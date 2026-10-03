import { AsyncLocalStorage } from "node:async_hooks";

/** What every log line inside a request should know. M2 adds workspaceId and userId. */
export interface RequestContextData {
  readonly requestId: string;
}

const storage = new AsyncLocalStorage<RequestContextData>();

/**
 * Per-request context that follows the request through every `await`,
 * without being passed as an argument. Read by the logger's mixin.
 */
export const requestContext = {
  run<T>(data: RequestContextData, fn: () => T): T {
    return storage.run(data, fn);
  },
  current(): RequestContextData | undefined {
    return storage.getStore();
  },
};
