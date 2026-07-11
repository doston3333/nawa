import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { CoachPanel } from "./coach-panel";
import type { HelpLevel } from "@/domain/learning/types";

function Harness({ attempted = false }: { attempted?: boolean }) {
  const [level, setLevel] = useState<HelpLevel>(0);
  return <CoachPanel level={level} attempted={attempted} onAdvance={setLevel} />;
}

it("reveals help in order and blocks the full answer before an attempt", () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Next hint" }));
  expect(screen.getByText("Replay audio")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Next hint" }));
  expect(screen.getByText("Show diacritics")).toBeVisible();
  for (let step = 2; step < 6; step += 1) fireEvent.click(screen.getByRole("button", { name: "Next hint" }));
  expect(screen.getByRole("button", { name: "Next hint" })).toBeDisabled();
});
