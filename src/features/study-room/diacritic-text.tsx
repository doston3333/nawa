"use client";

import { useState } from "react";

type DiacriticLevel = "FULL" | "AMBIGUOUS" | "ON_TAP" | "NONE";

export function DiacriticText({ vocalized, ambiguous, plain, level }: {
  vocalized: string;
  ambiguous: string;
  plain: string;
  level: DiacriticLevel;
}) {
  const [revealed, setRevealed] = useState(false);
  const text = level === "FULL" || (level === "ON_TAP" && revealed)
    ? vocalized
    : level === "AMBIGUOUS" ? ambiguous : plain;
  return (
    <div>
      <p lang="ar" dir="rtl">{text}</p>
      {level === "ON_TAP" && !revealed ? (
        <button type="button" onClick={() => setRevealed(true)}>Show diacritics</button>
      ) : null}
    </div>
  );
}
