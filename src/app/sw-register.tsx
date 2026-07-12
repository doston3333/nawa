"use client";

import { useEffect } from "react";

/** Registers the shell service worker without affecting server rendering or API writes. */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    const enabled =
      process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_SW === "true";
    const serviceWorker = navigator.serviceWorker;
    if (!enabled || !serviceWorker || typeof serviceWorker.register !== "function") {
      return;
    }

    void serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .catch(() => {
        // Offline support is progressive enhancement; a failed registration must not block Nawa.
      });
  }, []);

  return null;
}
