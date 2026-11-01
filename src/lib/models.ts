import { gateway, type LanguageModel } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Preferred: Meta Model API directly (MODEL_API_KEY). Fallback: Meta models via Vercel AI Gateway.
const meta = process.env.MODEL_API_KEY
  ? createOpenAICompatible({ name: "meta", baseURL: process.env.MODEL_API_BASE || "https://api.meta.ai/v1", apiKey: process.env.MODEL_API_KEY, supportsStructuredOutputs: true })
  : null;

type Candidate = { id: string; label: string; model: () => LanguageModel };
const CANDIDATES: Candidate[] = [
  ...(meta ? [{ id: "meta-api:muse-spark-1.3", label: "Muse Spark 1.3 · Meta Model API", model: () => meta.chatModel(process.env.MODEL_API_MODEL || "muse-spark-1.3") }] : []),
  { id: "meta/muse-spark-1.3", label: "Muse Spark 1.3", model: () => gateway("meta/muse-spark-1.3") },
  { id: "meta/muse-glimmer-30b", label: "Muse Glimmer 30B", model: () => gateway("meta/muse-glimmer-30b") },
  { id: "meta/llama-4-maverick", label: "Llama 4 Maverick (open weights)", model: () => gateway("meta/llama-4-maverick") },
  { id: "meta/llama-4-scout", label: "Llama 4 Scout (open weights)", model: () => gateway("meta/llama-4-scout") },
];

let preferred = 0;
const ACCESS = /free tier|do not have access|not available|unauthori[sz]ed|forbidden|401|403|insufficient|credit|quota|not found/i;

/** Run fn with the best Meta model this deployment can reach; falls through on access errors only. */
export async function withMetaModel<T>(fn: (m: LanguageModel, label: string) => Promise<T>): Promise<{ result: T; model: string }> {
  let lastErr: unknown;
  for (let i = preferred; i < CANDIDATES.length; i++) {
    const c = CANDIDATES[i];
    try {
      const result = await fn(c.model(), c.label);
      preferred = i;
      return { result, model: c.label };
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message + " " + String((e as { responseBody?: string }).responseBody || "") : String(e);
      if (!ACCESS.test(msg)) { if (e instanceof Error) e.message = `[${c.label}] ${e.message}`; throw e; }
      console.warn(`[mendoscope] ${c.id} unavailable: ${msg.slice(0, 160)}`);
    }
  }
  throw lastErr;
}
