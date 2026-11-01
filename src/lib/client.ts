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
  after?: string; mendedAt?: number; model?: string;
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
