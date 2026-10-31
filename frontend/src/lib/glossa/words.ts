// Scanning a line's code: what's outside its strings and its «!» comment.

const WORD = /[\p{L}_][\p{L}\p{N}_]*/gu;
const WORD_CHAR = /[\p{L}\p{N}_]/u;
const WORD_START = /[\p{L}_]/gu;

/**
 * The word `text` ends with, as /[\p{L}_][\p{L}\p{N}_]*$/u would find it, in linear
 * time: that regex retries from every letter of a long run (a pasted line of 20,000
 * letters took a second per keystroke).
 */
export function lastWord(text: string): string | undefined {
  let start = text.length;
  while (start > 0) {
    // One code point back: a letter outside the BMP is two code units.
    const pair = start >= 2 && /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(text.slice(start - 2, start));
    const step = pair ? 2 : 1;
    if (!WORD_CHAR.test(text.slice(start - step, start))) break;
    start -= step;
  }
  // Digits can't start a word: it starts at the run's first letter or «_».
  WORD_START.lastIndex = start;
  const first = WORD_START.exec(text);
  return first === null ? undefined : text.slice(first.index);
}

/** The words in a line's code: not in strings, not in the comment. */
export function codeWords(line: string): { from: number; text: string }[] {
  const words: { from: number; text: string }[] = [];
  let quote: string | null = null;
  let start = 0;
  const flush = (end: number) => {
    for (const match of line.slice(start, end).matchAll(WORD)) {
      words.push({ from: start + match.index, text: match[0] });
    }
  };
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
        start = i + 1;
      }
    } else if (ch === "'" || ch === '"') {
      flush(i);
      quote = ch;
    } else if (ch === "!") {
      flush(i);
      return words;
    }
  }
  if (!quote) flush(line.length);
  return words;
}
