import library from "./algorithms.json";

/**
 * The navbar's Αλγόριθμοι: well-known algorithms of the exam, by topic. They live in
 * JSON so that backend/tests/test_algorithm_library.py runs each one through the real
 * interpreter; add one there and it is covered.
 */
export type Algorithm = {
  title: string;
  /** The lines shown: a whole program, or (with `frame`) a part of one. */
  code: string[];
  /** A remark under the code. */
  note?: string;
  /** A part of a program: the name of the frame that makes it runnable. */
  frame?: string;
};

export type AlgorithmGroup = { name: string; algorithms: Algorithm[] };

/** What surrounds a part of a program (declarations, sample values, printing the result) so it runs. */
type Frame = { before: string[]; after: string[] };

export const ALGORITHM_GROUPS: AlgorithmGroup[] = library.groups;
const FRAMES: Record<string, Frame> = library.frames;

/** The code as the panel shows and copies it. */
export function algorithmCode(algorithm: Algorithm): string {
  return algorithm.code.join("\n");
}

/** The whole program the editor opens: test_algorithm_library.py's `program` builds the same. */
export function algorithmProgram(algorithm: Algorithm): string {
  const frame = algorithm.frame === undefined ? null : FRAMES[algorithm.frame];
  const lines = frame
    ? [...frame.before, ...algorithm.code.map((line) => `  ${line}`), ...frame.after]
    : algorithm.code;
  return `${lines.join("\n")}\n`;
}
