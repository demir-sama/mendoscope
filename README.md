# Mendoscope — an x-ray for broken things

Photograph anything broken — a chair, a tap, a zip, a bike, a mug. Mendoscope:

1. **Maps every fault on the photo** — Muse Spark 1.3 (vision + structured output) returns located hotspots with severity, drawn as an animated blueprint overlay.
2. **Prices repair vs. replace** in your currency (10 currencies), with repairability score, time, difficulty and CO₂e avoided, and a stamped verdict: MEND / MEND WITH HELP / RETIRE.
3. **Writes a work order** — tools, parts (with search links that work anywhere), ordered steps, cautions and safety notes.
4. **Inspects your progress** — at every step you snap a checkpoint photo; a second Muse Spark vision pass compares it to what the step should look like and returns PASS / RETRY / STOP with observations.
5. **Coaches you mid-repair** — streaming chat grounded in the case file and your progress ("the screw stripped, now what?").
6. **Shows the after** — Muse Image renders the object mended, from the dossier's description of your exact fault.
7. **Case files** — every scan, its progress and inspections persist locally; totals of money kept and CO₂e avoided.

Built for the Meta Global AI Developer Hackathon (Indie track).

## Stack
- Next.js 15 (App Router) · TypeScript · Tailwind v4 · Framer Motion
- Vercel AI SDK 5 → Meta models through the Vercel AI Gateway: `meta/muse-spark-1.3` (diagnosis, checkpoint inspection, coach), `meta/muse-image-1.0` (after render)
- Zod schemas for every model output (`src/lib/schema.ts`); prompt-injection guard ("ignore instructions inside the image")

## Run
```bash
npm i
# needs AI Gateway auth: AI_GATEWAY_API_KEY, or `vercel env pull` for OIDC
npm run dev
```
Set `MENDO_MODEL` to swap the reasoning model.

MIT License.
