import { render, screen } from "@testing-library/react";
import HomePage from "./page";

describe("Today page", () => {
  it("offers one primary action into the Study Room", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "Your Arabic, built daily" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Begin today’s study" })).toHaveAttribute(
      "href",
      "/study",
    );
  });
});
