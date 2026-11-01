import { streamText } from "ai";
import { MODEL } from "@/lib/schema";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, dossier } = await req.json();
  const result = streamText({
    model: MODEL,
    system:
      "You are Mendoscope, a calm master repairer coaching someone mid-repair. Use the dossier below as ground truth about the object. " +
      "Answer in short, concrete steps (max ~120 words). If they hit a snag (stripped screw, wrong part, crack spreading), re-plan from where they are. " +
      "Offer low-cost or improvised alternatives that work anywhere in the world. Flag safety issues firmly.\n\nDOSSIER:\n" +
      JSON.stringify(dossier).slice(0, 12000),
    messages: (messages || []).slice(-12),
  });
  return result.toTextStreamResponse();
}
