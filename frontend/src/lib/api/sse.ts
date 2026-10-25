export type SseMessage = { event: string; data: string };

/**
 * Incremental text/event-stream parser: feed it decoded chunks as they arrive,
 * get back the messages completed so far. (EventSource can't POST or send an
 * Authorization header, so the agent stream is read with fetch.)
 */
export function createSseParser(): (chunk: string) => SseMessage[] {
  let buffer = "";
  return (chunk) => {
    buffer += chunk;
    // A trailing \r may be the first half of a \r\n: leave it for the next chunk.
    const cut = buffer.endsWith("\r") ? buffer.length - 1 : buffer.length;
    buffer = buffer.slice(0, cut).replace(/\r\n?/g, "\n") + buffer.slice(cut);
    const messages: SseMessage[] = [];
    let end: number;
    while ((end = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let event = "message";
      const data: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
      }
      if (data.length > 0) messages.push({ event, data: data.join("\n") });
    }
    return messages;
  };
}
