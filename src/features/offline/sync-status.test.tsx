import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { SyncStatus } from "./sync-status";

const status = vi.hoisted(() => ({ online: true, pendingCount: 0, lastSyncAt: null as string | null, syncError: null as string | null }));
vi.mock("@/lib/offline/use-offline-status", () => ({
  useOfflineStatus: () => status,
}));

it("announces that local work is waiting to sync", () => {
  status.online = false;
  status.pendingCount = 1;
  status.syncError = null;
  render(<SyncStatus profileId="profile-1" />);
  expect(screen.getByRole("status")).toHaveTextContent("Saved locally · waiting to sync");
});

it("announces sync attention when the server rejected a mutation", () => {
  status.online = true;
  status.pendingCount = 1;
  status.syncError = "conflict";
  render(<SyncStatus profileId="profile-1" />);
  expect(screen.getByRole("status")).toHaveTextContent("Sync needs attention");
});
