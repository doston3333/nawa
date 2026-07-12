import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { StudySessionView } from "@/domain/learning/types";
import { StudyRoom } from "./study-room";

const thirtyMinutePlan: StudySessionView = {
  currentTaskIndex: 0,
  status: "ACTIVE",
  plan: {
    id: "00000000-0000-4000-8000-000000000100",
    profileId: "00000000-0000-4000-8000-000000000001",
    durationMinutes: 30,
    createdAt: "2026-07-11T10:00:00.000Z",
    tasks: [
      { id: "arrival-1", stage: "ARRIVAL", kind: "CALIBRATION", atomIds: [], prompt: "Arrive", promptArabic: "بَ", expectedAnswer: null, estimatedMinutes: 2 },
      { id: "retrieval-1", stage: "RETRIEVAL", kind: "RECALL", atomIds: [], prompt: "Recall", promptArabic: null, expectedAnswer: null, estimatedMinutes: 7 },
      { id: "concept-1", stage: "NEW_CONCEPT", kind: "LESSON", atomIds: ["letter-ba"], prompt: "Learn", promptArabic: "بَ", expectedAnswer: "ب", estimatedMinutes: 6 },
      { id: "input-1", stage: "INPUT", kind: "READ", atomIds: ["letter-ba"], prompt: "Read", promptArabic: null, expectedAnswer: null, estimatedMinutes: 5 },
      { id: "output-1", stage: "OUTPUT", kind: "PRODUCE", atomIds: ["letter-ba"], prompt: "Write", promptArabic: null, expectedAnswer: null, estimatedMinutes: 7 },
      { id: "close-1", stage: "CLOSE", kind: "JOURNAL", atomIds: [], prompt: "Close", promptArabic: null, expectedAnswer: null, estimatedMinutes: 3 },
    ],
  },
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => thirtyMinutePlan,
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("renders the focused arrival stage without gamification", async () => {
  render(<StudyRoom durationMinutes={30} />);
  expect(await screen.findByRole("heading", { name: "Arrival" })).toBeVisible();
  expect(screen.getByText("2 min")).toBeVisible();
  expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  expect(screen.queryByText("Leaderboard")).not.toBeInTheDocument();
});
