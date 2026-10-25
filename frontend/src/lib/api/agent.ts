import { API_URL, apiHeaders, errorFrom } from "./client";
import { createSseParser } from "./sse";

export type AgentMode = "ask" | "agent";

export type ChatRequest = {
  conversation_id: string | null;
  program_id?: string | null;
  message: string;
  code: string;
  mode: AgentMode;
  /** Agent mode: write_code proposes, and the student approves (Ctrl+Enter). */
  approve?: boolean;
};

/** The SSE events of POST /agent/chat (backend/app/agent/stream.py). */
export type AgentEvent =
  | { type: "conversation"; id: string }
  | { type: "text"; delta: string }
  | { type: "tool"; name: string }
  | { type: "edit"; code: string; summary: string }
  | { type: "error"; message: string }
  | { type: "done" };

export async function* streamChat(
  request: ChatRequest,
  signal?: AbortSignal,
): AsyncGenerator<AgentEvent> {
  const res = await fetch(`${API_URL}/api/v1/agent/chat`, {
    method: "POST",
    headers: await apiHeaders(),
    body: JSON.stringify(request),
    signal,
  });
  if (!res.ok || !res.body) throw await errorFrom(res);

  const parse = createSseParser();
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    for (const message of parse(value)) {
      yield { type: message.event, ...JSON.parse(message.data) } as AgentEvent;
    }
  }
}
