// Fails the build if a Client Component ever imports this, so server values never reach the browser.
import "server-only";
import { parseServerEnv } from "./env.schema";

export const serverEnv = parseServerEnv(process.env);
