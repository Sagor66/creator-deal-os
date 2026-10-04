/** Thrown on purpose by /debug/errors to prove error reporting end to end. */
export class DeliberateTestError extends Error {
  override readonly name = "DeliberateTestError";
}
