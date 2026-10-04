/** Request headers worth keeping for debugging; everything else is dropped. */
export const ALLOWED_HEADERS = ["user-agent", "content-type", "x-request-id"];

/**
 * What the Sentry SDK may collect, for every SDK we run (node, Next.js server,
 * browser). Sentry v11 replaced `sendDefaultPii` with `dataCollection`, and its
 * defaults collect user info, cookies, headers, bodies, query strings, local
 * variables and database query data. We turn all of that off; `scrubEvent` is
 * the second line of defence (docs/design/observability.md §4).
 *
 * A function, so each SDK gets a fresh, mutable object.
 */
export function minimalDataCollection() {
  return {
    userInfo: false,
    cookies: false,
    httpHeaders: { request: { allow: [...ALLOWED_HEADERS] }, response: false },
    httpBodies: [],
    urlQueryParams: false,
    databaseQueryData: false,
    stackFrameVariables: false,
    queues: false,
    graphQL: { document: false, variables: false },
    genAI: { inputs: false, outputs: false },
  };
}
