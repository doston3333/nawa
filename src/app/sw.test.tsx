import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ServiceWorkerRegistration from "./sw-register";

describe("ServiceWorkerRegistration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("registers the versioned service worker when explicitly enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_SW", "true");
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { register },
    });

    render(<ServiceWorkerRegistration />);

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith("/sw.js", { updateViaCache: "none" }),
    );
    expect(register).toHaveBeenCalledTimes(1);
  });

  it("does nothing when service workers are unavailable", async () => {
    vi.stubEnv("NEXT_PUBLIC_ENABLE_SW", "true");
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });

    render(<ServiceWorkerRegistration />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(navigator.serviceWorker).toBeUndefined();
  });
});
