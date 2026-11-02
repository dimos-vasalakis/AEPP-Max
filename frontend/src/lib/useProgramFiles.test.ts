import { describe, expect, it } from "vitest";
import type { Program } from "@/lib/api/programs";
import { linkCreated } from "./useProgramFiles";

const oldProgram: Program = {
  id: "old-program",
  title: "Old account",
  code: "ΓΡΑΨΕ 1",
  language: "glossa",
  created_at: "2026-11-02T00:00:00Z",
  updated_at: "2026-11-02T00:00:00Z",
};

describe("a save response after an account switch", () => {
  it("cannot link the previous account's program", () => {
    const afterSwitch = {
      owner: "new-user",
      epoch: 2,
      files: { glossa: null, pseudocode: null },
    };

    expect(linkCreated(afterSwitch, 1, "glossa", oldProgram, oldProgram.code)).toBe(afterSwitch);
  });

  it("rejects an old response even if the student switched back to the same account", () => {
    const backToOriginal = {
      owner: "original-user",
      epoch: 3,
      files: { glossa: null, pseudocode: null },
    };

    expect(linkCreated(backToOriginal, 1, "glossa", oldProgram, oldProgram.code)).toBe(
      backToOriginal,
    );
  });

  it("still links a program when the account has not changed", () => {
    const current = {
      owner: "original-user",
      epoch: 1,
      files: { glossa: null, pseudocode: null },
    };

    expect(linkCreated(current, 1, "glossa", oldProgram, oldProgram.code).files.glossa).toEqual({
      id: oldProgram.id,
      title: oldProgram.title,
      saved: oldProgram.code,
      status: "saved",
    });
  });
});
