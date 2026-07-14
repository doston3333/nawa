"use client";

import { useMemo, useRef, useState } from "react";

export type StrokePoint = { x: number; y: number };
export type Stroke = StrokePoint[];

export interface HandwritingResult {
  score: number;
  strokes: Stroke[];
  metrics: { strokeCount: number; pointCount: number; verticalCoverage: number; passed: boolean };
}

function scoreStrokes(strokes: Stroke[]): HandwritingResult {
  const points = strokes.flat();
  if (points.length < 2) return { score: 0, strokes, metrics: { strokeCount: strokes.length, pointCount: points.length, verticalCoverage: 0, passed: false } };
  const ys = points.map((point) => point.y);
  const verticalCoverage = Math.min(1, (Math.max(...ys) - Math.min(...ys)) / 112);
  const score = Math.round(Math.min(1, 0.35 + verticalCoverage * 0.65) * 100);
  return { score, strokes, metrics: { strokeCount: strokes.length, pointCount: points.length, verticalCoverage, passed: score >= 75 } };
}

export function HandwritingPractice({ glyph, onComplete }: { glyph: string; onComplete: (result: HandwritingResult) => void }) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redo, setRedo] = useState<Stroke[]>([]);
  const active = useRef<Stroke | null>(null);
  const result = useMemo(() => scoreStrokes(strokes), [strokes]);
  const pointFor = (event: React.PointerEvent<SVGSVGElement>): StrokePoint => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - bounds.left) / bounds.width) * 360, y: ((event.clientY - bounds.top) / bounds.height) * 180 };
  };
  const start = (event: React.PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    active.current = [pointFor(event)];
  };
  const move = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!active.current) return;
    active.current = [...active.current, pointFor(event)];
    setStrokes((current) => [...current.slice(0, -1), active.current!]);
  };
  const end = () => {
    if (!active.current) return;
    setStrokes((current) => [...current.slice(0, -1), active.current!]);
    setRedo([]);
    active.current = null;
  };
  return <div className="handwriting-practice">
    <svg className="handwriting-canvas" viewBox="0 0 360 180" role="img" aria-label={`Tracing canvas for ${glyph}`} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <path className="handwriting-baseline" d="M 20 135 H 340 M 20 70 H 340" />
      <text className="handwriting-model" x="180" y="130" textAnchor="middle" lang="ar" direction="rtl">{glyph}</text>
      {strokes.map((stroke, index) => stroke.length > 1 ? <polyline key={`${index}-${stroke.length}`} className="handwriting-stroke" points={stroke.map((point) => `${point.x},${point.y}`).join(" ")} /> : null)}
    </svg>
    <div className="handwriting-toolbar">
      <button type="button" onClick={() => { const last = strokes.at(-1); if (last) { setStrokes(strokes.slice(0, -1)); setRedo([...redo, last]); } }} disabled={!strokes.length}>Undo</button>
      <button type="button" onClick={() => { const last = redo.at(-1); if (last) { setStrokes([...strokes, last]); setRedo(redo.slice(0, -1)); } }} disabled={!redo.length}>Redo</button>
      <button type="button" onClick={() => { setStrokes([]); setRedo([]); }}>Clear</button>
    </div>
    <p className="handwriting-score" aria-live="polite">{strokes.length ? `Trace score: ${result.score}%${result.metrics.passed ? " — ready" : " — add a taller, steadier stroke"}` : "Trace over the model. You can retry freely."}</p>
    <button type="button" className="secondary-action" disabled={!result.metrics.passed} onClick={() => onComplete(result)}>Save this attempt</button>
  </div>;
}
