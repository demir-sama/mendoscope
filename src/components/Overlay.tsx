"use client";
import { motion } from "framer-motion";
import type { Diagnosis } from "@/lib/schema";

const SEV: Record<string, string> = { cosmetic: "#ffc24a", functional: "#ff6b3d", critical: "#ff3d6b" };

export function Overlay({ photo, d, active, onHover }: { photo: string; d: Diagnosis; active: number | null; onHover: (i: number | null) => void }) {
  return (
    <div className="relative w-full overflow-hidden rounded-sm corner border border-line/30 bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo} alt={d.object} className="block w-full select-none" style={{ filter: "saturate(.85) contrast(1.05)" }} />
      <div className="absolute inset-0 bg-ink/25 mix-blend-multiply" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {d.hotspots.map((h, i) => {
          const [x, y, w, hh] = h.box.map((v) => Math.max(0, Math.min(1, v)) * 100);
          const c = SEV[h.severity] || "#ff6b3d";
          const on = active === null || active === i;
          return (
            <g key={i} opacity={on ? 1 : 0.25} style={{ transition: "opacity .25s" }} onMouseEnter={() => onHover(i)} onMouseLeave={() => onHover(null)}>
              <motion.rect x={x} y={y} width={Math.max(w, 2)} height={Math.max(hh, 2)} fill={c} fillOpacity={active === i ? 0.18 : 0.06}
                stroke={c} strokeWidth={0.45} vectorEffect="non-scaling-stroke" strokeDasharray="1 0"
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: 0.35 + i * 0.28, duration: 0.9, ease: "easeInOut" }} />
            </g>
          );
        })}
      </svg>
      {d.hotspots.map((h, i) => {
        const [x, y] = h.box;
        const c = SEV[h.severity] || "#ff6b3d";
        return (
          <motion.button key={i} type="button" onMouseEnter={() => onHover(i)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(i)}
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.9 + i * 0.28, type: "spring", stiffness: 400, damping: 18 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full font-mono text-[12px] font-semibold text-ink shadow-lg"
            style={{ left: `${Math.max(0.03, Math.min(0.97, x)) * 100}%`, top: `${Math.max(0.04, Math.min(0.96, y)) * 100}%`, background: c, boxShadow: `0 0 0 4px ${c}33, 0 0 24px ${c}` }}>
            {i + 1}
          </motion.button>
        );
      })}
      {d.hotspots.length > 0 && <div className="pointer-events-none absolute left-3 top-3 tick bg-ink/70 px-2 py-1">fig. 01 — {d.hotspots.length} fault{d.hotspots.length > 1 ? "s" : ""} mapped</div>}
    </div>
  );
}
