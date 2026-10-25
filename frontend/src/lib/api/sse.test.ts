import { describe, expect, it } from "vitest";
import { createSseParser } from "./sse";

describe("createSseParser", () => {
  it("parses complete messages", () => {
    const parse = createSseParser();
    expect(parse('event: text\ndata: {"delta":"Γεια"}\n\nevent: done\ndata: {}\n\n')).toEqual([
      { event: "text", data: '{"delta":"Γεια"}' },
      { event: "done", data: "{}" },
    ]);
  });

  it("buffers messages split across chunks", () => {
    const parse = createSseParser();
    expect(parse("event: te")).toEqual([]);
    expect(parse('xt\ndata: {"delta":"α"}\n')).toEqual([]);
    expect(parse("\n")).toEqual([{ event: "text", data: '{"delta":"α"}' }]);
  });

  it("handles CRLF line endings, including a CRLF split across chunks", () => {
    const parse = createSseParser();
    expect(parse("data: x\r")).toEqual([]);
    expect(parse("\n\r\n")).toEqual([{ event: "message", data: "x" }]);
  });

  it("joins multi-line data", () => {
    const parse = createSseParser();
    expect(parse("data: α\r")).toEqual([]);
    expect(parse("\ndata: β\r\n\r\n")).toEqual([{ event: "message", data: "α\nβ" }]);
  });
});
