import type { Metadata } from "next";
import { Instrument_Serif, IBM_Plex_Mono, Inter_Tight } from "next/font/google";
import "./globals.css";

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono" });
const sans = Inter_Tight({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Mendoscope — an x-ray for broken things",
  description: "Photograph anything broken. Muse Spark maps every fault, prices repair vs. replace, and coaches you through the fix with photo checkpoints.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${mono.variable} ${sans.variable} antialiased`}>{children}</body>
    </html>
  );
}
