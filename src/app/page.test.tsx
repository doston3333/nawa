import { render, screen } from "@testing-library/react";
import HomePage from "./page";

describe("Today page", () => {
  it("offers path as primary action with professional MSA framing", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "Your Arabic, built daily" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Continue path" })).toHaveAttribute("href", "/learn");
    expect(screen.getByRole("link", { name: "Long study session" })).toHaveAttribute("href", "/study");
    expect(screen.getByText(/scored mini-tests after each unit/i)).toBeVisible();
    expect(screen.getByText(/No hearts, streaks, XP, or leagues/i)).toBeVisible();
  });
});
