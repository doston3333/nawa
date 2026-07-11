import { render, screen } from "@testing-library/react";
import { ProgressSummary } from "./progress-summary";

it("describes abilities separately without a fluency percentage", () => {
  render(<ProgressSummary counts={{ READING: 8, LISTENING: 5, WRITING: 3, SPEAKING: 2 }} />);
  expect(screen.getByText("You can read 8 items, understand 5 in listening, write 3, and speak 2.")).toBeVisible();
  expect(screen.queryByText(/% fluent/i)).not.toBeInTheDocument();
});
