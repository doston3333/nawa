import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilePicker } from "./profile-picker";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("ProfilePicker", () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    vi.restoreAllMocks();
  });

  it("lets a known user choose a profile without implying authentication", () => {
    render(<ProfilePicker initialProfiles={[{ id: "p1", name: "Amina" }]} />);
    expect(screen.getByRole("heading", { name: "Who is studying?" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Amina" })).toBeVisible();
    expect(screen.getByText(/no password/i)).toBeVisible();
  });

  it("selects a profile through the server route", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, profileId: "p1" }), { status: 200 }),
    );
    render(<ProfilePicker initialProfiles={[{ id: "p1", name: "Amina" }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Amina" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(refresh).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/profile/select",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("selects a focused profile with Enter", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, profileId: "p1" }), { status: 200 }),
    );
    render(<ProfilePicker initialProfiles={[{ id: "p1", name: "Amina" }]} />);

    fireEvent.keyDown(screen.getByRole("button", { name: "Amina" }), { key: "Enter" });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("creates and selects a named profile", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "p2", name: "Omar" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, profileId: "p2" }), { status: 200 }));
    render(<ProfilePicker initialProfiles={[]} />);

    fireEvent.change(screen.getByLabelText("Create a profile"), { target: { value: "Omar" } });
    fireEvent.click(screen.getByRole("button", { name: "Create profile" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/profiles",
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.getByText("Omar")).toBeInTheDocument();
  });
});
