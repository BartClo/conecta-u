import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { questionSlide, useReducedMotionSafe } from "../lib/motion";

function mockMatchMedia(initialMatches: boolean) {
  let listener: ((e: MediaQueryListEvent) => void) | undefined;
  const mql = {
    matches: initialMatches,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      listener = cb;
    },
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mql));
  return {
    fire: (matches: boolean) => {
      mql.matches = matches;
      listener?.({ matches } as MediaQueryListEvent);
    },
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

describe("questionSlide", () => {
  it("enters from and exits towards opposite sides by direction", () => {
    const initial = questionSlide.initial as (d: 1 | -1) => { x: number };
    const exit = questionSlide.exit as (d: 1 | -1) => { x: number };
    expect(initial(1).x).toBe(24);
    expect(initial(-1).x).toBe(-24);
    expect(exit(1).x).toBe(-24);
    expect(exit(-1).x).toBe(24);
  });
});

describe("useReducedMotionSafe hidratacion", () => {
  it("renders false on the server snapshot even if the preference is reduce", async () => {
    mockMatchMedia(true);
    const { renderToString } = await import("react-dom/server");
    const { createElement } = await import("react");
    function Probe() {
      return createElement("span", null, String(useReducedMotionSafe()));
    }
    expect(renderToString(createElement(Probe))).toContain("false");
  });
});
