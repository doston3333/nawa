import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LanguageInk } from "./language-ink";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "word-kitab",
        kind: "WORD",
        register: "MSA",
        canonicalArabic: "كتاب",
        vocalizedArabic: "كِتَاب",
        englishGloss: "book",
        root: "ك ت ب",
        patternNote: "fiʿāl noun pattern",
      }),
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("opens a micro-panel with gloss and root from curriculum", async () => {
  render(<LanguageInk atomId="word-kitab" />);
  fireEvent.click(screen.getByRole("button", { name: "Inspect Arabic form" }));
  await waitFor(() => {
    expect(screen.getByText("book")).toBeVisible();
  });
  expect(screen.getByText("ك ت ب")).toBeVisible();
  expect(screen.getByText("كِتَاب")).toBeVisible();
});
