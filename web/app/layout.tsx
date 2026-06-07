import type { Metadata } from "next";
import { IBM_Plex_Mono, Saira } from "next/font/google";
import "./globals.css";

// Instrument typeface for all flight data (data-model numerals, codes, times).
const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Technical grotesque for panel labels and headers (cockpit-language.md).
const saira = Saira({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "FLIGHT DECK — Search & Fare Tracker",
  description:
    "An avionics-grade flight search and fare tracker. Google Flights data via an MCP server.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${plexMono.variable} ${saira.variable}`}>
      <body>{children}</body>
    </html>
  );
}
