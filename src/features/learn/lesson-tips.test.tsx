import { fireEvent, render, screen } from "@testing-library/react";
import { LessonTips } from "./lesson-tips";

it("renders lesson tips and can collapse them", () => {
  render(
    <LessonTips
      lessonTitle="Letters 1–7"
      tips={[
        "Arabic is written right-to-left. Connect letters in a word.",
        "Alif (ا) is a long vowel carrier.",
      ]}
    />,
  );
  expect(screen.getByText(/right-to-left/i)).toBeVisible();
  expect(screen.getByText(/Alif/i)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: /Hide explanation/i }));
  expect(screen.queryByText(/right-to-left/i)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Show explanation/i }));
  expect(screen.getByText(/right-to-left/i)).toBeVisible();
});
