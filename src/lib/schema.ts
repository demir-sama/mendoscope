import { z } from "zod";

export const Hotspot = z.object({
  label: z.string().describe("Short name of the fault, 2-5 words"),
  detail: z.string().describe("One sentence: what is wrong here and why it matters"),
  severity: z.enum(["cosmetic", "functional", "critical"]),
  box: z
    .array(z.number())
    .length(4)
    .describe("Bounding box [x, y, width, height] as fractions 0-1 of the image (origin top-left)"),
});

export const Step = z.object({
  title: z.string(),
  how: z.string().describe("2-3 precise sentences of instruction"),
  minutes: z.number(),
  checkpoint: z.string().describe("What a photo of a correctly finished step should show"),
  caution: z.string().nullable().describe("Safety or damage risk for this step, or null"),
});

export const Diagnosis = z.object({
  object: z.string().describe("What the object is, specific (e.g. 'Ladder-back oak dining chair')"),
  material: z.string(),
  failure: z.string().describe("The failure mode in one sentence"),
  rootCause: z.string().describe("Likely root cause, one sentence"),
  hotspots: z.array(Hotspot).min(1).max(5),
  verdict: z.enum(["MEND", "MEND_WITH_HELP", "RETIRE"]),
  verdictReason: z.string(),
  repairability: z.number().describe("0-10 how repairable this is at home"),
  difficulty: z.enum(["beginner", "handy", "skilled", "pro"]),
  totalMinutes: z.number(),
  repairCost: z.object({ low: z.number(), high: z.number() }).describe("Parts/material cost in the requested currency"),
  replaceCost: z.object({ low: z.number(), high: z.number() }).describe("Cost of a comparable new replacement in the requested currency"),
  co2SavedKg: z.number().describe("Estimated kg CO2e avoided by repairing instead of replacing"),
  tools: z.array(z.string()).max(8),
  parts: z.array(z.object({ name: z.string(), searchTerm: z.string().describe("Generic search query to buy it anywhere") })).max(6),
  steps: z.array(Step).min(3).max(8),
  safety: z.array(z.string()).max(4),
  afterPrompt: z.string().describe("A vivid prompt describing a photo of this exact object after a careful, visible-but-beautiful repair, same angle and setting"),
});
export type Diagnosis = z.infer<typeof Diagnosis>;

export const Checkpoint = z.object({
  status: z.enum(["PASS", "RETRY", "STOP"]),
  confidence: z.number().describe("0-1"),
  observations: z.array(z.string()).max(4),
  advice: z.string().describe("What to do next, 1-2 sentences"),
});
export type Checkpoint = z.infer<typeof Checkpoint>;

export const MODEL = process.env.MENDO_MODEL || "meta/muse-spark-1.3";
export const IMAGE_MODEL = "meta/muse-image-1.0";
