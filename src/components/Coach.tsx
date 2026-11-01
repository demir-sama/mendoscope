"use client";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import type { Case } from "@/lib/client";

type Msg = { role: "user" | "assistant"; content: string };
const STARTERS = ["A screw is stripped, now what?", "I don't own a clamp — alternatives?", "How do I know it's safe to use again?"];

export function Coach({ c }: { c: Case }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  const send = async (q: string) => {
    if (!q.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }, { role: "assistant", content: "" }];
    setMsgs(next); setText(""); setBusy(true);
    const progress = c.diagnosis.steps.map((s, i) => `${c.done[i] ? "[done]" : "[todo]"} ${s.title}`).join("\n");
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next.slice(0, -1), dossier: { ...c.diagnosis, progress, currency: c.currency } }) });
      if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
      const reader = r.body.getReader(); const dec = new TextDecoder(); let acc = "";
      for (;;) { const { done, value } = await reader.read(); if (done) break; acc += dec.decode(value, { stream: true });
        setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: acc }]); end.current?.scrollIntoView({ block: "nearest" }); }
    } catch (e) { setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: `⚠ ${e instanceof Error ? e.message : e}` }]); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
        {msgs.length === 0 && <p className="text-sm text-paper/60">Stuck mid-repair? The mender knows this exact case file and which steps you&apos;ve finished.</p>}
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={m.role === "user" ? "ml-10 bg-line/10 px-4 py-2.5 text-sm" : "panel mr-6 whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed"}>
            {m.role === "assistant" && <div className="tick mb-1">mender</div>}{m.content || <span className="blink">▍</span>}
          </motion.div>
        ))}
        <div ref={end} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="border border-line/30 px-3 py-1.5 text-xs text-paper/75 hover:border-line hover:text-line">{s}</button>)}</div>
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="mt-3 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about this repair…" className="panel flex-1 px-4 py-3 text-sm outline-none focus:border-line" />
        <button disabled={busy} className="bg-flare px-5 font-mono text-xs font-semibold uppercase tracking-widest text-ink disabled:opacity-50">Ask</button>
      </form>
    </div>
  );
}
