import { describe, it, expect } from "vitest";
import { contentSignature } from "./cloud";
import { makeInitialState } from "@/store/initialState";

describe("contentSignature", () => {
  it("changes when the card collection grows (so auto-backup fires)", () => {
    const a = makeInitialState();
    const b = { ...a, collection: { "g1-0-0": 1 } };
    expect(contentSignature(a)).not.toBe(contentSignature(b));
  });

  it("changes when journey steps or game/mantra counts change", () => {
    const base = makeInitialState();
    expect(contentSignature(base)).not.toBe(contentSignature({ ...base, gamesWon: 1 }));
    expect(contentSignature(base)).not.toBe(contentSignature({ ...base, mantrasFocused: 1 }));
  });

  it("is stable for identical state", () => {
    const s = makeInitialState();
    expect(contentSignature(s)).toBe(contentSignature(makeInitialState()));
  });
});
