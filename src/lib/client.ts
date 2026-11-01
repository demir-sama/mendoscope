"use client";
import type { Diagnosis } from "./schema";

export async function toDataUrl(src: File | string, max = 1280): Promise<string> {
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("Could not read image")); img.src = url; });
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  if (typeof src !== "string") URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg", 0.86);
}

export async function thumb(dataUrl: string) { return toDataUrl(dataUrl, 320); }

export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "INR", "BRL", "CAD", "AUD", "MXN", "KRW"] as const;
export function money(n: number, cur: string) {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: cur, maximumFractionDigits: cur === "JPY" || cur === "KRW" ? 0 : 0 }).format(n); }
  catch { return `${Math.round(n)} ${cur}`; }
}

export type Case = {
  id: string; createdAt: number; currency: string; photo: string; thumb: string;
  diagnosis: Diagnosis; done: boolean[]; checks: Record<number, { status: string; advice: string; observations: string[] }>;
  after?: string; mendedAt?: number; model?: string; inspection?: string;
};

const KEY = "mendoscope.cases.v1";
export function loadCases(): Case[] { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }
export function saveCases(cases: Case[]) {
  // photos are big; keep full photo only for the 6 newest cases
  const slim = cases.map((c, i) => (i < 6 ? c : { ...c, photo: c.thumb, after: undefined }));
  try { localStorage.setItem(KEY, JSON.stringify(slim)); } catch { localStorage.setItem(KEY, JSON.stringify(slim.slice(0, 3))); }
}

export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
  if (!r.ok || j.error) throw new Error(j.error || `HTTP ${r.status}`);
  return j as T;
}

/** Draw a labelled 6x6 grid over the photo so the vision model can ground faults to cells. */
export async function gridded(dataUrl: string, cols = 6, rows = 6): Promise<string> {
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("grid")); img.src = dataUrl; });
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const g = c.getContext("2d")!; g.drawImage(img, 0, 0);
  const cw = c.width / cols, ch = c.height / rows;
  g.strokeStyle = "rgba(255,255,0,.9)"; g.lineWidth = Math.max(2, c.width / 400);
  for (let i = 1; i < cols; i++) { g.beginPath(); g.moveTo(i * cw, 0); g.lineTo(i * cw, c.height); g.stroke(); }
  for (let j = 1; j < rows; j++) { g.beginPath(); g.moveTo(0, j * ch); g.lineTo(c.width, j * ch); g.stroke(); }
  const fs = Math.round(Math.min(cw, ch) * 0.2); g.font = `bold ${fs}px sans-serif`; g.textBaseline = "top";
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const label = String.fromCharCode(65 + i) + (j + 1); const x = i * cw + 6, y = j * ch + 6;
    g.fillStyle = "rgba(0,0,0,.7)"; g.fillRect(x - 3, y - 3, g.measureText(label).width + 6, fs + 6);
    g.fillStyle = "#ffff00"; g.fillText(label, x, y);
  }
  return c.toDataURL("image/jpeg", 0.8);
}
