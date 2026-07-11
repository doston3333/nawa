import { render, screen } from "@testing-library/react";
import HomePage from "./page";

describe("Today page", () => {
  it("offers one primary action into the Study Room with public demo framing", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "Your Arabic, built daily" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Begin today’s study" })).toHaveAttribute(
      "href",
      "/study",
    );
    expect(screen.getByText(/serious Modern Standard Arabic Study Room/i)).toBeVisible();
    expect(screen.getByText(/Public demo|Demo honesty/i)).toBeVisible();
    expect(screen.getByText(/Rate limits/i)).toBeVisible();
  });
});
