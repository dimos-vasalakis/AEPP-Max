import { beforeEach, describe, expect, it } from "vitest";
import { stashForSignIn, takePendingSave } from "./pendingSave";

// A Map-backed localStorage: the tests run in node.
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
} as Storage;

describe("pendingSave", () => {
  beforeEach(() => store.clear());

  it("gives the stashed code back once", () => {
    stashForSignIn({ language: "pseudocode", code: "Αλγόριθμος Α" });
    expect(takePendingSave(Date.now())).toEqual({ language: "pseudocode", code: "Αλγόριθμος Α" });
    expect(takePendingSave(Date.now())).toBeNull();
  });

  it("can give it back and keep it, for a sign-in that hasn't happened yet", () => {
    stashForSignIn({ language: "glossa", code: "ΠΡΟΓΡΑΜΜΑ Α" });
    expect(takePendingSave(Date.now(), undefined, true)?.code).toBe("ΠΡΟΓΡΑΜΜΑ Α");
    // A reload while still signed out: not again.
    expect(takePendingSave(Date.now(), undefined, true)).toBeNull();
    expect(takePendingSave(Date.now())?.code).toBe("ΠΡΟΓΡΑΜΜΑ Α");
    expect(takePendingSave(Date.now())).toBeNull();
  });

  it("doesn't stash an empty editor", () => {
    stashForSignIn({ language: "glossa", code: "  \n" });
    expect(store.size).toBe(0);
  });

  it("forgets code left for over an hour", () => {
    stashForSignIn({ language: "glossa", code: "ΠΡΟΓΡΑΜΜΑ Α" });
    expect(takePendingSave(Date.now() + 2 * 60 * 60 * 1000)).toBeNull();
    expect(store.size).toBe(0);
  });

  it("keeps the code for later when it isn't taken", () => {
    stashForSignIn({ language: "glossa", code: "ΠΡΟΓΡΑΜΜΑ Α" });
    expect(takePendingSave(Date.now(), () => false)).toBeNull();
    expect(takePendingSave(Date.now())).toEqual({ language: "glossa", code: "ΠΡΟΓΡΑΜΜΑ Α" });
  });

  it("ignores anything malformed", () => {
    store.set("aepp-pending-save", "{");
    expect(takePendingSave(Date.now())).toBeNull();
    store.set("aepp-pending-save", JSON.stringify({ language: "c", code: "x", at: Date.now() }));
    expect(takePendingSave(Date.now())).toBeNull();
    expect(store.size).toBe(0);
  });
});
