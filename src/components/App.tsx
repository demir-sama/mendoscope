"use client";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, animate } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Diagnosis, Checkpoint } from "@/lib/schema";
import { CURRENCIES, Case, loadCases, money, postJSON, saveCases, thumb, toDataUrl } from "@/lib/client";
import { Overlay } from "./Overlay";
import { Coach } from "./Coach";

const PRESETS = [
  { id: "chair", label: "Split chair leg", src: "/presets/chair.jpg" },
  { id: "faucet", label: "Dripping tap", src: "/presets/faucet.jpg" },
  { id: "jeans", label: "Torn knee + zip", src: "/presets/jeans.jpg" },
  { id: "bike", label: "Slipped chain", src: "/presets/bike.jpg" },
  { id: "headphones", label: "Snapped headband", src: "/presets/headphones.jpg" },
  { id: "mug", label: "Shattered mug", src: "/presets/mug.jpg" },
];
const PHASES = ["calibrating optics", "segmenting materials", "tracing fracture lines", "reading wear patterns", "pricing parts worldwide", "weighing repair vs replace", "drafting work order"];
const VERDICT: Record<string, { word: string; color: string; sub: string }> = {
  MEND: { word: "MEND IT", color: "#6ee7a8", sub: "home repair recommended" },
  MEND_WITH_HELP: { word: "MEND · WITH HELP", color: "#ffc24a", sub: "worth fixing, get a hand" },
  RETIRE: { word: "RETIRE", color: "#ff6b3d", sub: "repair unsafe or uneconomic" },
};

function Count({ to, fmt = (n: number) => Math.round(n).toString(), delay = 0 }: { to: number; fmt?: (n: number) => string; delay?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => { const c = animate(0, to, { duration: 1.4, delay, ease: [0.2, 0.8, 0.2, 1], onUpdate: setV }); return () => c.stop(); }, [to, delay]);
  return <>{fmt(v)}</>;
}

export default function App() {
  const [cases, setCases] = useState<Case[]>([]);
  const [view, setView] = useState<"intake" | "scan" | "case" | "shelf">("intake");
  const [current, setCurrent] = useState<Case | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [skill, setSkill] = useState("handy");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState(0);

  useEffect(() => { setCases(loadCases()); const c = localStorage.getItem("mendoscope.currency"); if (c) setCurrency(c); }, []);
  useEffect(() => { localStorage.setItem("mendoscope.currency", currency); }, [currency]);

  const persist = useCallback((c: Case) => {
    setCurrent(c);
    setCases((prev) => { const next = [c, ...prev.filter((p) => p.id !== c.id)]; saveCases(next); return next; });
  }, []);

  const diagnose = useCallback(async (dataUrl: string) => {
    setPhoto(dataUrl); setError(null); setView("scan"); setPhase(0);
    const t = setInterval(() => setPhase((p) => Math.min(p + 1, PHASES.length - 1)), 1700);
    try {
      const { diagnosis, model } = await postJSON<{ diagnosis: Diagnosis; model: string }>("/api/diagnose", { image: dataUrl, currency, skill, note });
      const c: Case = { id: crypto.randomUUID(), createdAt: Date.now(), currency, photo: dataUrl, thumb: await thumb(dataUrl), diagnosis, done: diagnosis.steps.map(() => false), checks: {}, model };
      persist(c); setView("case");
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); setView("intake"); }
    finally { clearInterval(t); }
  }, [currency, skill, note, persist]);

  const mended = cases.filter((c) => c.mendedAt);
  const saved = mended.reduce((s, c) => s + Math.max(0, (c.diagnosis.replaceCost.low + c.diagnosis.replaceCost.high) / 2 - (c.diagnosis.repairCost.low + c.diagnosis.repairCost.high) / 2), 0);
  const co2 = mended.reduce((s, c) => s + c.diagnosis.co2SavedKg, 0);

  return (
    <div className="blueprint vignette min-h-screen">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
        <button onClick={() => setView("intake")} className="group flex items-center gap-3" aria-label="Mendoscope home">
          <Lens />
          <span className="font-serif text-[28px] leading-none tracking-tight">Mendo<span className="italic text-line">scope</span></span>
        </button>
        <nav className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[.14em]">
          <button onClick={() => setView("intake")} className={`px-3 py-2 ${view === "intake" ? "text-line" : "text-paper/60 hover:text-paper"}`}>New scan</button>
          <button onClick={() => setView("shelf")} className={`flex items-center gap-2 px-3 py-2 ${view === "shelf" ? "text-line" : "text-paper/60 hover:text-paper"}`}>
            Case files <span className="rounded-full bg-line/15 px-2 py-0.5 text-line">{cases.length}</span>
          </button>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-24 md:px-8">
        <AnimatePresence mode="wait">
          {view === "intake" && (
            <motion.section key="intake" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.45 }}>
              <Intake onPhoto={diagnose} currency={currency} setCurrency={setCurrency} skill={skill} setSkill={setSkill} note={note} setNote={setNote} error={error} />
              {mended.length > 0 && (
                <div className="mt-10 flex flex-wrap gap-8 border-t border-line/15 pt-6 font-mono text-sm text-paper/70">
                  <span><b className="text-moss">{mended.length}</b> things brought back</span>
                  <span><b className="text-moss">{money(saved, currency)}</b> not spent on replacements*</span>
                  <span><b className="text-moss">{co2.toFixed(1)} kg</b> CO₂e avoided</span>
                </div>
              )}
            </motion.section>
          )}
          {view === "scan" && photo && (
            <motion.section key="scan" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mx-auto max-w-3xl pt-6">
              <div className="relative overflow-hidden corner border border-line/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt="scanning" className="block w-full opacity-80" style={{ filter: "grayscale(.6) contrast(1.2) brightness(.8)" }} />
                <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_40%,#0a1830_100%)]" />
                <div className="scanline" />
                <div className="absolute inset-0 blueprint opacity-30 mix-blend-screen" />
              </div>
              <div className="mt-6 space-y-1.5 font-mono text-[13px]">
                {PHASES.slice(0, phase + 1).map((p, i) => (
                  <motion.div key={p} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className={i === phase ? "text-line" : "text-paper/40"}>
                    {i === phase ? "▸" : "✓"} {p}{i === phase && <span className="blink">_</span>}
                  </motion.div>
                ))}
              </div>
              <p className="mt-4 tick">Meta vision model · schema-validated dossier</p>
            </motion.section>
          )}
          {view === "case" && current && (
            <motion.section key={"case" + current.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CaseView c={current} onChange={persist} />
            </motion.section>
          )}
          {view === "shelf" && (
            <motion.section key="shelf" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Shelf cases={cases} open={(c) => { setCurrent(c); setView("case"); }} remove={(id) => setCases((p) => { const n = p.filter((x) => x.id !== id); saveCases(n); return n; })} />
            </motion.section>
          )}
        </AnimatePresence>
      </main>
      <footer className="relative z-10 mx-auto max-w-7xl px-5 pb-8 tick md:px-8">Mendoscope · built on Meta models (Muse Spark · Llama 4) · estimates are guidance, not a warranty</footer>
    </div>
  );
}

function Lens() {
  return (
    <svg width="38" height="38" viewBox="0 0 40 40" className="transition-transform duration-500 group-hover:rotate-90">
      <circle cx="20" cy="20" r="17" fill="none" stroke="#7fd3ff" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="10" fill="none" stroke="#7fd3ff" strokeWidth="1" strokeDasharray="2 3" />
      <path d="M20 3v6M20 31v6M3 20h6M31 20h6" stroke="#7fd3ff" strokeWidth="1.5" />
      <path d="M15 22l4-6 2 4 3-3" stroke="#ff6b3d" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Intake(p: { onPhoto: (d: string) => void; currency: string; setCurrency: (s: string) => void; skill: string; setSkill: (s: string) => void; note: string; setNote: (s: string) => void; error: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const mx = useMotionValue(0.5), my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [6, -6]), { stiffness: 120, damping: 14 });
  const ry = useSpring(useTransform(mx, [0, 1], [-8, 8]), { stiffness: 120, damping: 14 });
  const file = async (f?: File | null) => { if (f && f.type.startsWith("image/")) p.onPhoto(await toDataUrl(f)); };

  return (
    <div className="grid items-center gap-10 pt-6 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
      <div>
        <div className="tick mb-5">field instrument nº 7 · for the broken things in your life</div>
        <h1 className="font-serif text-[64px] leading-[.92] tracking-tight md:text-[96px]">
          An x-ray for<br /><motion.span className="italic text-line" initial={{ opacity: 0, filter: "blur(10px)" }} animate={{ opacity: 1, filter: "blur(0)" }} transition={{ delay: 0.3, duration: 0.9 }}>broken things.</motion.span>
        </h1>
        <p className="mt-6 max-w-lg text-[17px] leading-relaxed text-paper/75">
          Photograph a chair, a tap, a zip, a bike, a mug. Mendoscope maps every fault on the photo, prices <em>repair vs. replace</em> in your currency, writes a step-by-step work order, then <b className="text-paper">inspects your progress photos</b> as you fix it.
        </p>
        <div className="mt-8 grid max-w-lg grid-cols-3 gap-3 font-mono text-[11px]">
          <label className="flex flex-col gap-1.5"><span className="tick">currency</span>
            <select value={p.currency} onChange={(e) => p.setCurrency(e.target.value)} className="panel px-3 py-2.5 outline-none focus:border-line">{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="flex flex-col gap-1.5"><span className="tick">your hands</span>
            <select value={p.skill} onChange={(e) => p.setSkill(e.target.value)} className="panel px-3 py-2.5 outline-none focus:border-line">
              <option value="beginner">first-timer</option><option value="handy">handy</option><option value="skilled">skilled</option></select></label>
          <label className="col-span-3 flex flex-col gap-1.5"><span className="tick">anything we can&apos;t see? (optional)</span>
            <input value={p.note} onChange={(e) => p.setNote(e.target.value)} placeholder="e.g. it wobbles when I sit, started after a move" className="panel px-3 py-2.5 font-sans text-sm outline-none placeholder:text-paper/30 focus:border-line" /></label>
        </div>
        {p.error && <div className="mt-5 max-w-lg border border-flare/50 bg-flare/10 px-4 py-3 font-mono text-xs text-flare">Scan failed: {p.error}</div>}
      </div>

      <div style={{ perspective: 1200 }}>
        <motion.div style={{ rotateX: rx, rotateY: ry }}
          onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); mx.set((e.clientX - r.left) / r.width); my.set((e.clientY - r.top) / r.height); }}
          onMouseLeave={() => { mx.set(0.5); my.set(0.5); }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); file(e.dataTransfer.files?.[0]); }}
          className={`panel corner relative cursor-pointer p-8 transition-colors ${drag ? "border-line bg-line/10" : ""}`} onClick={() => input.current?.click()}>
          <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => file(e.target.files?.[0])} />
          <div className="relative mx-auto grid aspect-[4/3] place-items-center overflow-hidden border border-dashed border-line/40">
            <motion.div className="absolute h-[140%] w-[140%] rounded-full border border-line/20" animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} style={{ borderStyle: "dashed" }} />
            <motion.div className="absolute h-[80%] w-[80%] rounded-full border border-line/25" animate={{ rotate: -360 }} transition={{ duration: 28, repeat: Infinity, ease: "linear" }} />
            <div className="text-center">
              <div className="font-serif text-4xl italic">Drop a photo</div>
              <div className="mt-2 font-mono text-xs text-paper/60">or tap to open your camera</div>
              <div className="mt-6 inline-block bg-flare px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-ink shadow-[0_0_30px_#ff6b3d66]">Begin scan</div>
            </div>
          </div>
        </motion.div>
        <div className="mt-6">
          <div className="tick mb-3">or examine a specimen</div>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
            {PRESETS.map((s, i) => (
              <motion.button key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.06 }}
                whileHover={{ y: -4 }} onClick={async () => p.onPhoto(await toDataUrl(s.src))} className="group text-left" data-preset={s.id}>
                <div className="relative aspect-square overflow-hidden border border-line/25 group-hover:border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.src} alt={s.label} className="h-full w-full object-cover grayscale-[.5] transition duration-500 group-hover:scale-110 group-hover:grayscale-0" />
                </div>
                <div className="mt-1.5 font-mono text-[10px] leading-tight text-paper/60 group-hover:text-paper">{s.label}</div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CaseView({ c, onChange }: { c: Case; onChange: (c: Case) => void }) {
  const d = c.diagnosis;
  const [hover, setHover] = useState<number | null>(null);
  const [tab, setTab] = useState<"order" | "bench" | "coach" | "after">("order");
  const v = VERDICT[d.verdict];
  const doneCount = c.done.filter(Boolean).length;
  const repairMid = (d.repairCost.low + d.repairCost.high) / 2, replaceMid = (d.replaceCost.low + d.replaceCost.high) / 2;
  const ratio = Math.min(1, repairMid / Math.max(1, replaceMid));

  return (
    <div className="grid gap-8 pt-4 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5 lg:sticky lg:top-4 lg:self-start">
        <Overlay photo={c.photo} d={d} active={hover} onHover={setHover} />
        <div className="grid gap-2">
          {d.hotspots.map((h, i) => (
            <motion.div key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.12 }}
              className={`panel flex gap-3 px-4 py-3 transition-colors ${hover === i ? "border-line" : ""}`}>
              <span className="font-mono text-sm font-semibold" style={{ color: h.severity === "cosmetic" ? "#ffc24a" : h.severity === "critical" ? "#ff3d6b" : "#ff6b3d" }}>{String(i + 1).padStart(2, "0")}</span>
              <div><div className="text-[15px] font-medium">{h.label} <span className="ml-1 tick">{h.severity}</span></div><div className="text-sm text-paper/65">{h.detail}</div></div>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <div className="tick">case file · {new Date(c.createdAt).toLocaleDateString()} · {d.material}{c.model ? ` · read by ${c.model}` : ""}</div>
        <h2 className="mt-2 font-serif text-5xl leading-[1] tracking-tight">{d.object}</h2>
        <p className="mt-3 text-paper/75">{d.failure} <span className="text-paper/50">Root cause: {d.rootCause}</span></p>

        <div className="mt-6 flex items-center gap-5">
          <motion.div initial={{ scale: 2.4, rotate: -18, opacity: 0 }} animate={{ scale: 1, rotate: -6, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.3 }}
            className="border-[3px] px-4 py-2 font-mono text-xl font-bold tracking-[.2em]" style={{ color: v.color, borderColor: v.color, boxShadow: `0 0 40px ${v.color}33` }}>{v.word}</motion.div>
          <div className="text-sm text-paper/70"><div className="tick">{v.sub}</div>{d.verdictReason}</div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat k="repairability" v={<><Count to={d.repairability} fmt={(n) => n.toFixed(1)} /><span className="text-paper/40">/10</span></>} />
          <Stat k="time" v={<><Count to={d.totalMinutes} /> <span className="text-sm text-paper/50">min</span></>} />
          <Stat k="difficulty" v={<span className="capitalize">{d.difficulty}</span>} />
          <Stat k="co₂e avoided" v={<><Count to={d.co2SavedKg} fmt={(n) => n.toFixed(1)} /> <span className="text-sm text-paper/50">kg</span></>} />
        </div>

        <div className="panel mt-3 p-4">
          <div className="flex justify-between tick"><span>repair {money(d.repairCost.low, c.currency)}–{money(d.repairCost.high, c.currency)}</span><span>replace {money(d.replaceCost.low, c.currency)}–{money(d.replaceCost.high, c.currency)}</span></div>
          <div className="relative mt-3 h-3 bg-flare/25">
            <motion.div className="absolute inset-y-0 left-0 bg-moss" initial={{ width: 0 }} animate={{ width: `${ratio * 100}%` }} transition={{ delay: 0.6, duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }} />
          </div>
          <div className="mt-2 font-mono text-xs text-paper/60">Fixing costs ~{Math.round(ratio * 100)}% of replacing · keeps <b className="text-moss">{money(Math.max(0, replaceMid - repairMid), c.currency)}</b> in your pocket</div>
        </div>

        <div className="mt-8 flex gap-1 border-b border-line/20 font-mono text-[11px] uppercase tracking-[.14em]">
          {([["order", "Work order"], ["bench", `Workbench ${doneCount}/${d.steps.length}`], ["coach", "Ask the mender"], ["after", "Repair card"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`relative px-4 py-3 ${tab === k ? "text-line" : "text-paper/55 hover:text-paper"}`}>
              {l}{tab === k && <motion.div layoutId="tab" className="absolute inset-x-0 -bottom-px h-0.5 bg-line" />}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="pt-5">
            {tab === "order" && <Order d={d} />}
            {tab === "bench" && <Bench c={c} onChange={onChange} />}
            {tab === "coach" && <Coach c={c} />}
            {tab === "after" && <After c={c} onChange={onChange} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="panel px-4 py-3"><div className="tick">{k}</div><div className="mt-1 font-serif text-3xl">{v}</div></div>;
}

function Order({ d }: { d: Diagnosis }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><div className="tick mb-2">tools</div><div className="flex flex-wrap gap-1.5">{d.tools.map((t) => <span key={t} className="border border-line/30 px-2.5 py-1 text-sm">{t}</span>)}</div></div>
        <div><div className="tick mb-2">parts · find anywhere</div><div className="space-y-1">{d.parts.map((p) => (
          <a key={p.name} target="_blank" rel="noreferrer" href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(p.searchTerm)}`} className="flex items-center justify-between border-b border-line/10 py-1 text-sm hover:text-line">{p.name}<span className="font-mono text-xs text-paper/40">search ↗</span></a>))}</div></div>
      </div>
      <ol className="space-y-3">
        {d.steps.map((s, i) => (
          <motion.li key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="panel flex gap-4 p-4">
            <div className="font-serif text-3xl italic text-line">{i + 1}</div>
            <div className="flex-1"><div className="flex justify-between gap-3"><b className="font-medium">{s.title}</b><span className="font-mono text-xs text-paper/50">{s.minutes} min</span></div>
              <p className="mt-1 text-sm leading-relaxed text-paper/75">{s.how}</p>
              {s.caution && <p className="mt-2 font-mono text-xs text-amber">⚠ {s.caution}</p>}</div>
          </motion.li>
        ))}
      </ol>
      {d.safety.length > 0 && <div className="border border-flare/40 bg-flare/5 p-4"><div className="tick mb-2 !text-flare">safety</div><ul className="list-disc space-y-1 pl-5 text-sm text-paper/80">{d.safety.map((s) => <li key={s}>{s}</li>)}</ul></div>}
    </div>
  );
}

function Bench({ c, onChange }: { c: Case; onChange: (c: Case) => void }) {
  const d = c.diagnosis;
  const firstOpen = c.done.findIndex((x) => !x);
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const pct = c.done.filter(Boolean).length / d.steps.length;

  const inspect = async (i: number, f?: File | null) => {
    if (!f) return; setBusy(i); setErr(null);
    try {
      const image = await toDataUrl(f, 1024);
      const { checkpoint } = await postJSON<{ checkpoint: Checkpoint }>("/api/checkpoint", { image, object: d.object, step: `${d.steps[i].title}: ${d.steps[i].how}`, expected: d.steps[i].checkpoint });
      const done = [...c.done]; if (checkpoint.status === "PASS") done[i] = true;
      const all = done.every(Boolean);
      onChange({ ...c, done, checks: { ...c.checks, [i]: checkpoint }, mendedAt: all ? c.mendedAt || Date.now() : c.mendedAt });
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  };
  const toggle = (i: number) => { const done = [...c.done]; done[i] = !done[i]; onChange({ ...c, done, mendedAt: done.every(Boolean) ? c.mendedAt || Date.now() : undefined }); };

  return (
    <div>
      <div className="mb-5 flex items-center gap-4">
        <svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" stroke="#7fd3ff22" strokeWidth="5" fill="none" />
          <motion.circle cx="28" cy="28" r="24" stroke="#6ee7a8" strokeWidth="5" fill="none" strokeLinecap="round" transform="rotate(-90 28 28)" initial={false} animate={{ pathLength: pct }} transition={{ type: "spring", stiffness: 80, damping: 15 }} /></svg>
        <div><div className="font-serif text-2xl">{pct === 1 ? "Mended. Welcome back." : `Step ${firstOpen + 1} of ${d.steps.length}`}</div>
          <div className="text-sm text-paper/60">Snap a checkpoint photo after each step. The inspector passes it, or tells you what to fix.</div></div>
      </div>
      {err && <div className="mb-3 font-mono text-xs text-flare">Inspection failed: {err}</div>}
      <div className="space-y-2.5">
        {d.steps.map((s, i) => {
          const chk = c.checks[i]; const open = i === firstOpen;
          return (
            <motion.div layout key={i} className={`panel p-4 ${open ? "border-line shadow-[0_0_0_1px_#7fd3ff55,0_0_40px_#7fd3ff18]" : ""} ${c.done[i] ? "opacity-70" : ""}`}>
              <div className="flex items-start gap-3">
                <button onClick={() => toggle(i)} aria-label="mark done" className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center border ${c.done[i] ? "border-moss bg-moss text-ink" : "border-line/50"}`}>{c.done[i] && "✓"}</button>
                <div className="flex-1">
                  <div className={`font-medium ${c.done[i] ? "line-through decoration-moss/60" : ""}`}>{s.title}</div>
                  {open && <p className="mt-1 text-sm text-paper/75">{s.how}</p>}
                  {open && <p className="mt-2 font-mono text-[11px] text-line/80">checkpoint ▸ {s.checkpoint}</p>}
                  {chk && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className={`mt-3 border-l-2 pl-3 text-sm ${chk.status === "PASS" ? "border-moss" : chk.status === "STOP" ? "border-flare" : "border-amber"}`}>
                      <div className="font-mono text-xs font-semibold" style={{ color: chk.status === "PASS" ? "#6ee7a8" : chk.status === "STOP" ? "#ff6b3d" : "#ffc24a" }}>INSPECTOR · {chk.status}</div>
                      <ul className="mt-1 text-paper/70">{chk.observations.map((o) => <li key={o}>· {o}</li>)}</ul>
                      <div className="mt-1 text-paper/90">{chk.advice}</div>
                    </motion.div>
                  )}
                </div>
                <label className={`shrink-0 cursor-pointer border px-3 py-2 font-mono text-[10px] uppercase tracking-widest ${busy === i ? "border-line text-line" : "border-line/40 hover:border-line hover:text-line"}`}>
                  {busy === i ? <span className="blink">inspecting…</span> : "📷 checkpoint"}
                  <input type="file" accept="image/*" capture="environment" className="hidden" disabled={busy !== null} onChange={(e) => inspect(i, e.target.files?.[0])} data-step={i} />
                </label>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function After({ c, onChange }: { c: Case; onChange: (c: Case) => void }) {
  const d = c.diagnosis; const v = VERDICT[d.verdict];
  const card = useRef<HTMLDivElement>(null);
  const [caps, setCaps] = useState<{ image: boolean } | null>(null);
  const [busy, setBusy] = useState<"png" | "render" | null>(null); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { fetch("/api/caps").then((r) => r.json()).then(setCaps).catch(() => setCaps({ image: false })); }, []);
  const save = async () => {
    if (!card.current) return; setBusy("png");
    try { const { toPng } = await import("html-to-image"); const url = await toPng(card.current, { pixelRatio: 2, cacheBust: true });
      const a = document.createElement("a"); a.href = url; a.download = `mendoscope-${d.object.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`; a.click(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  };
  const render = async () => {
    setBusy("render"); setErr(null);
    try { const { image } = await postJSON<{ image: string }>("/api/render", { prompt: d.afterPrompt }); onChange({ ...c, after: image }); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  };
  const done = c.done.filter(Boolean).length;
  return (
    <div>
      <p className="text-sm text-paper/70">A one-page repair card: take it to a repair café, send it to the friend who owns the clamps, or keep it as proof you saved this thing.</p>
      <div ref={card} className="mt-4 overflow-hidden border border-line/40 bg-ink p-5" style={{ backgroundImage: "linear-gradient(rgba(127,211,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(127,211,255,.08) 1px,transparent 1px)", backgroundSize: "20px 20px" }}>
        <div className="flex items-start justify-between gap-4">
          <div><div className="tick">mendoscope · case file</div><div className="mt-1 font-serif text-3xl leading-none">{d.object}</div><div className="mt-1 text-xs text-paper/60">{d.failure}</div></div>
          <div className="-rotate-6 border-2 px-2 py-1 font-mono text-xs font-bold tracking-[.18em]" style={{ color: v.color, borderColor: v.color }}>{c.mendedAt ? "MENDED" : v.word}</div>
        </div>
        <div className="mt-4 grid grid-cols-[1fr_1.2fr] gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.after || c.photo} alt="" className="aspect-[4/3] w-full border border-line/30 object-cover" />
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div><div className="tick">repair</div><div className="text-base text-moss">{money(d.repairCost.high, c.currency)}</div></div>
            <div><div className="tick">replace</div><div className="text-base text-flare">{money(d.replaceCost.low, c.currency)}</div></div>
            <div><div className="tick">time</div><div className="text-base">{d.totalMinutes} min</div></div>
            <div><div className="tick">co₂e</div><div className="text-base">−{d.co2SavedKg} kg</div></div>
            <div className="col-span-2"><div className="tick">progress</div><div className="text-base">{done}/{d.steps.length} steps · {Object.values(c.checks).filter((k) => k.status === "PASS").length} inspected</div></div>
          </div>
        </div>
        <ol className="mt-4 space-y-1 text-xs text-paper/80">{d.steps.map((s, i) => <li key={i}><span className={c.done[i] ? "text-moss" : "text-line"}>{c.done[i] ? "✓" : i + 1}</span> {s.title}</li>)}</ol>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={save} disabled={!!busy} className="bg-line px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-ink disabled:opacity-60">{busy === "png" ? "saving…" : "Download card (PNG)"}</button>
        {caps?.image && <button onClick={render} disabled={!!busy} className="border border-line px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-line disabled:opacity-60">{busy === "render" ? <span className="blink">rendering…</span> : "Render mended (Muse Image)"}</button>}
      </div>
      {err && <div className="mt-3 font-mono text-xs text-flare">{err}</div>}
    </div>
  );
}

function Shelf({ cases, open, remove }: { cases: Case[]; open: (c: Case) => void; remove: (id: string) => void }) {
  if (!cases.length) return <div className="pt-20 text-center font-serif text-3xl italic text-paper/50">No case files yet. Scan something broken.</div>;
  return (
    <div className="pt-6">
      <h2 className="font-serif text-5xl">Case files</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cases.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="panel group overflow-hidden">
            <button onClick={() => open(c)} className="block w-full text-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.thumb} alt="" className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="p-4"><div className="tick">{c.mendedAt ? "✓ mended" : `${c.done.filter(Boolean).length}/${c.diagnosis.steps.length} steps`} · {VERDICT[c.diagnosis.verdict].word}</div>
                <div className="mt-1 font-serif text-2xl leading-tight">{c.diagnosis.object}</div></div>
            </button>
            <button onClick={() => remove(c.id)} className="px-4 pb-3 font-mono text-[10px] uppercase tracking-widest text-paper/40 hover:text-flare">discard</button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
