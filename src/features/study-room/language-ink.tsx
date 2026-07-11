"use client";

import { useCallback, useState } from "react";

export interface InkPayload {
  id: string;
  kind: string;
  register: string;
  canonicalArabic: string;
  vocalizedArabic: string;
  englishGloss: string;
  root: string | null;
  patternNote: string | null;
}

export function LanguageInk({ atomId, label }: { atomId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<InkPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/curriculum/atoms/${encodeURIComponent(atomId)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to load form");
      setData(body as InkPayload);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to load form");
    } finally {
      setLoading(false);
    }
  }, [atomId]);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (!data) await load();
  }

  return (
    <div className="language-ink">
      <button
        type="button"
        className="language-ink-trigger"
        onClick={() => void toggle()}
        aria-expanded={open}
      >
        {label ?? "Inspect Arabic form"}
      </button>
      {open ? (
        <div className="language-ink-panel" role="dialog" aria-label="Language Ink">
          {loading ? <p>Loading…</p> : null}
          {error ? <p role="alert">{error}</p> : null}
          {data ? (
            <dl className="language-ink-dl">
              <div>
                <dt>Vocalized</dt>
                <dd lang="ar" dir="rtl">{data.vocalizedArabic}</dd>
              </div>
              <div>
                <dt>Meaning</dt>
                <dd>{data.englishGloss}</dd>
              </div>
              {data.root ? (
                <div>
                  <dt>Root</dt>
                  <dd lang="ar" dir="rtl">{data.root}</dd>
                </div>
              ) : null}
              {data.patternNote ? (
                <div>
                  <dt>Pattern</dt>
                  <dd>{data.patternNote}</dd>
                </div>
              ) : null}
              <div>
                <dt>Register</dt>
                <dd>{data.register}</dd>
              </div>
            </dl>
          ) : null}
          <button type="button" className="language-ink-close" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}
