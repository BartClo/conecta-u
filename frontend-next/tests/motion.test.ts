import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useReducedMotionSafe } from "../lib/motion";

function mockMatchMedia(initialMatches: boolean) {
  let listener: ((e: MediaQueryListEvent) => void) | undefined;
  const mql = {
    matches: initialMatches,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      listener = cb;
    },
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue(mql),
  );
  return {
    fire: (matches: boolean) =>
      listener?.({ matches } as MediaQueryListEvent),
  };
}

describe("useReducedMotionSafe", () => {
  it("returns the initial matchMedia value and updates on change", () => {
    const { fire } = mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotionSafe());

    expect(result.current).toBe(false);

    act(() => {
      fire(true);
    });

    expect(result.current).toBe(true);
  });
});
