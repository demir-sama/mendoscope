import { streamText } from "ai";
import { withMetaModel } from "@/lib/models";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, dossier } = await req.json();
  const system =
    "You are Mendoscope, a calm master repairer coaching someone mid-repair. Use the dossier below as ground truth about the object. " +
    "Answer in short, concrete steps (max ~120 words, plain text, no markdown headings). If they hit a snag (stripped screw, wrong part, crack spreading), re-plan from where they are. " +
    "Offer low-cost or improvised alternatives that work anywhere in the world. Flag safety issues firmly.\n\nDOSSIER:\n" +
    JSON.stringify(dossier).slice(0, 12000);
  try {
    const { result, model } = await withMetaModel(async (m) => {
      const s = streamText({ model: m, system, messages: (messages || []).slice(-12), onError: () => {} });
      const it = s.fullStream[Symbol.asyncIterator]();
      // pull until first text or error so access errors can fall through to the next model
      const buffered: string[] = [];
      for (;;) {
        const { value, done } = await it.next();
        if (done) break;
        if (value.type === "error") throw value.error;
        if (value.type === "text-delta") { buffered.push(value.text); break; }
      }
      return { it, buffered };
    });
    const enc = new TextEncoder();
    const body = new ReadableStream({
      async start(ctrl) {
        for (const b of result.buffered) ctrl.enqueue(enc.encode(b));
        for (;;) {
          const { value, done } = await result.it.next();
          if (done) break;
          if (value.type === "text-delta") ctrl.enqueue(enc.encode(value.text));
          if (value.type === "error") { ctrl.enqueue(enc.encode("\n⚠ connection dropped, ask again.")); break; }
        }
        ctrl.close();
      },
    });
    return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "x-mendo-model": model } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Coach unavailable" }, { status: 500 });
  }
}
