import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nawa — Learn Arabic. Live it.",
  description: "A serious Modern Standard Arabic learning notebook.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
