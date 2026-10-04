import { z } from "zod";

/**
 * What the API reports about itself at `GET /meta`.
 *
 * The API parses its own response with this schema and the web app parses what
 * it receives with the same one, so neither side can drift from the contract
 * without a failing test.
 */
export const ServiceInfoSchema = z.object({
  service: z.literal("creator-deal-os-api"),
  version: z.string().min(1),
  time: z.iso.datetime(),
});

export type ServiceInfo = z.infer<typeof ServiceInfoSchema>;
