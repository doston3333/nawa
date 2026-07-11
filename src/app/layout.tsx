import type { Metadata } from "next";
import { Fraunces, Noto_Naskh_Arabic, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
});

const arabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic-face",
  weight: ["400", "500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Nawa — Learn Arabic. Live it.",
    template: "%s · Nawa",
  },
  description:
    "A serious Modern Standard Arabic Study Room for adult beginners. Focused daily sessions with ability-specific progress — not streaks or leaderboards.",
  applicationName: "Nawa",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Nawa",
    title: "Nawa — Serious Modern Standard Arabic study",
    description:
      "Open a focused MSA Study Room session: retrieve, learn, read, produce, and close with transparent ability progress.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nawa — Learn Arabic. Live it.",
    description: "Serious Modern Standard Arabic Study Room demo for adult beginners.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${arabic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
