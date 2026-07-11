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

export const metadata: Metadata = {
  title: "Nawa — Learn Arabic. Live it.",
  description: "A serious Modern Standard Arabic learning notebook.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${arabic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
