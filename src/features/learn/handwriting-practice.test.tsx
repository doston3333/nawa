import { act, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { HandwritingPractice } from "./handwriting-practice";

it("keeps completed pointer strokes as arrays when React batches pointer updates", () => {
  const onComplete = vi.fn();
  render(<HandwritingPractice glyph="ا" onComplete={onComplete} />);
  const canvas = screen.getByRole("img", { name: "Tracing canvas for ا" });
  Object.defineProperty(canvas, "getBoundingClientRect", {
    value: () => ({ left: 0, top: 0, width: 360, height: 180, right: 360, bottom: 180, x: 0, y: 0, toJSON: () => ({}) }),
  });
  Object.defineProperty(canvas, "setPointerCapture", { value: vi.fn() });

  act(() => {
    canvas.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 180, clientY: 20 }));
    canvas.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 180, clientY: 90 }));
    canvas.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 180, clientY: 145 }));
  });

  expect(screen.getByText(/Trace score:/)).toBeInTheDocument();
});
