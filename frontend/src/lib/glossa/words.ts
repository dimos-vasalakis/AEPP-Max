// Scanning a line's code: what's outside its strings and its «!» comment.

const WORD = /[\p{L}_][\p{L}\p{N}_]*/gu;

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
