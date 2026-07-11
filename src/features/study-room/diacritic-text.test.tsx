import { fireEvent, render, screen } from "@testing-library/react";
import { DiacriticText } from "./diacritic-text";

const props = { vocalized: "مَكْتَبَة", ambiguous: "مَكْتبة", plain: "مكتبة" };

it.each([
  ["FULL", "مَكْتَبَة"], ["AMBIGUOUS", "مَكْتبة"], ["NONE", "مكتبة"],
] as const)("renders %s support", (level, expected) => {
  render(<DiacriticText {...props} level={level} />);
  expect(screen.getByText(expected)).toBeVisible();
});

it("lets keyboard and pointer users reveal on-tap diacritics", () => {
  render(<DiacriticText {...props} level="ON_TAP" />);
  fireEvent.click(screen.getByRole("button", { name: "Show diacritics" }));
  expect(screen.getByText("مَكْتَبَة")).toBeVisible();
});
