import { afterEach, expect, it } from "vitest";
import { checkRateLimit, resetRateLimitsForTests } from "./rate-limit";

afterEach(() => resetRateLimitsForTests());

it("allows traffic under the session_start limit and blocks the next call", () => {
  const now = 1_000_000;
  for (let i = 0; i < 10; i += 1) {
    const result = checkRateLimit("session_start", "ip-1", now);
    expect(result.allowed).toBe(true);
  }
  const blocked = checkRateLimit("session_start", "ip-1", now);
  expect(blocked.allowed).toBe(false);
  expect(blocked.retryAfterSec).toBeGreaterThan(0);
});

it("isolates keys per identity", () => {
  const now = 2_000_000;
  for (let i = 0; i < 10; i += 1) {
    expect(checkRateLimit("session_start", "ip-a", now).allowed).toBe(true);
  }
  expect(checkRateLimit("session_start", "ip-b", now).allowed).toBe(true);
});
