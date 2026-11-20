import type { ChatRequest, ChatResponse } from "../../src/data/types.js";
import { buildBusinessContext } from "../ai/context.js";
import { chatCompletion, type ChatMessage } from "../ai/groq.js";
import { systemPrompt } from "../ai/prompt.js";
import { runTool, tools, type ChangedResource } from "../ai/tools.js";
import { getCurrentBusiness } from "../business.js";
import { HttpError, readJson, route } from "../http.js";

const MAX_MESSAGES = 12; // recent turns sent to the model (token budget)
const MAX_CHARS = 1500; // per message
const MAX_TOOL_ROUNDS = 3; // model -> tools -> model ... at most this many times

function validate(body: Partial<ChatRequest>): ChatMessage[] {
  if (!Array.isArray(body.messages) || body.messages.length === 0) throw new HttpError(400, "messages is required.");
  const messages = body.messages.slice(-MAX_MESSAGES).map((m): ChatMessage => {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
      throw new HttpError(400, "Each message needs a role (user/assistant) and text content.");
    }
    return { role: m.role, content: m.content.trim().slice(0, MAX_CHARS) };
  });
  // the model must be answering the owner, not continuing its own turn
  while (messages.length && messages[0].role === "assistant") messages.shift();
  const last = messages.at(-1);
  if (!last || last.role !== "user" || !last.content) throw new HttpError(400, "The last message must be from the user.");
  return messages;
}

/**
 * POST /api/chat { messages: [{ role, content }] } -> { reply, recorded, changed }
 *
 * The business snapshot is rebuilt from the database on every call, so the
 * model always sees current numbers. When the owner reports a sale, expense or
 * restock, the model calls a tool that writes it to the database; `recorded`
 * lists what was saved and `changed` tells the app which screens to refresh.
 */
export const POST = route(async (request): Promise<ChatResponse> => {
  const messages = validate(await readJson<Partial<ChatRequest>>(request));
  const biz = await getCurrentBusiness(request);
  const convo: ChatMessage[] = [{ role: "system", content: systemPrompt(await buildBusinessContext(biz)) }, ...messages];

  const recorded: string[] = [];
  const changed = new Set<ChangedResource>();

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    // on the last round, no more tools: the model must answer in words
    const completion = await chatCompletion(convo, { tools: round < MAX_TOOL_ROUNDS ? tools : undefined });
    if (completion.toolCalls.length === 0) {
      return { reply: completion.text || "Sorry, I didn't catch that. Could you say it again?", recorded, changed: [...changed] };
    }
    convo.push({ role: "assistant", content: completion.text || null, tool_calls: completion.toolCalls });
    for (const call of completion.toolCalls) {
      const result = await runTool(biz, call.function.name, call.function.arguments);
      if (result.recorded) recorded.push(result.recorded);
      result.changed?.forEach((c) => changed.add(c));
      convo.push({ role: "tool", tool_call_id: call.id, content: result.content });
    }
  }
  return { reply: recorded.length ? "Done." : "Sorry, I couldn't finish that. Please try again.", recorded, changed: [...changed] };
});
