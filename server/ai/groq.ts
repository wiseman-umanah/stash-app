// Groq API client — plain fetch against Groq's OpenAI-compatible endpoint, no SDK.
// Same approach as gitcap's groq.py: default model, fallback when a model is
// retired, and Groq errors translated into messages that are safe to show users.
import { HttpError } from "../http.js";

// GROQ_BASE_URL is the same override the official Groq SDK honours (proxies, gateways, tests).
const API_BASE = `${(process.env.GROQ_BASE_URL ?? "https://api.groq.com").replace(/\/+$/, "")}/openai/v1`;
export const DEFAULT_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
// Tried in order when the configured model has been retired.
const FALLBACK_MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
const TIMEOUT_MS = 25_000;
// Only wait out a 429 inline if Groq says it clears quickly; otherwise tell the user.
const MAX_INLINE_RETRY_SECONDS = 3;

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

/** OpenAI-style function tool definition. */
export interface ToolDefinition {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface Completion {
  text: string;
  toolCalls: ToolCall[];
  model: string;
  usage: { promptTokens: number; completionTokens: number };
}

class ModelUnavailable extends Error {}
class RetryAfter extends Error {
  readonly seconds: number;
  constructor(seconds: number) {
    super("retry-after");
    this.seconds = seconds;
  }
}

function apiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    console.error("GROQ_API_KEY is not set");
    throw new HttpError(503, "Stash's AI isn't set up yet.");
  }
  return key;
}

async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  let res: Response;
  const isForm = body instanceof FormData;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "User-Agent": "stash-app",
        // FormData sets its own multipart boundary header
        ...(isForm ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof HttpError) throw err;
    console.error("Groq unreachable:", err);
    throw new HttpError(502, "I couldn't reach my AI service. Please try again.");
  }
  if (res.ok) return (await res.json()) as T;

  const payload = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
  const code = payload.error?.code ?? "";
  const message = payload.error?.message ?? res.statusText;
  console.error(`Groq ${res.status} ${code}: ${message}`);

  if (res.status === 401) throw new HttpError(503, "Stash's AI key is invalid — it needs to be updated.");
  if (res.status === 429) {
    const seconds = Number(res.headers.get("retry-after"));
    if (Number.isFinite(seconds) && seconds > 0 && seconds <= MAX_INLINE_RETRY_SECONDS) throw new RetryAfter(seconds);
    throw new HttpError(429, "I'm getting a lot of questions right now — give me a minute and ask again.");
  }
  if (res.status === 413 || /request too large/i.test(message)) {
    throw new HttpError(413, "That conversation got too long for me. Start a new chat and ask again.");
  }
  if (res.status === 404 || code === "model_not_found" || code === "model_decommissioned") throw new ModelUnavailable(message);
  throw new HttpError(502, "My AI service had a problem. Please try again.");
}

async function availableModels(): Promise<Set<string>> {
  const data = await request<{ data?: { id: string; active?: boolean }[] }>("GET", "/models");
  return new Set((data.data ?? []).filter((m) => m.active !== false).map((m) => m.id));
}

async function complete(messages: ChatMessage[], model: string, maxTokens: number, tools?: ToolDefinition[]): Promise<Completion> {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.3,
    max_completion_tokens: maxTokens,
  };
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = "auto";
  }
  if (model.startsWith("openai/gpt-oss")) {
    // keep answers quick and the token budget for the reply itself
    body.reasoning_effort = "low";
    body.include_reasoning = false;
  }

  type Response = {
    model?: string;
    choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  let data: Response;
  try {
    data = await request<Response>("POST", "/chat/completions", body);
  } catch (err) {
    if (!(err instanceof RetryAfter)) throw err;
    await new Promise((r) => setTimeout(r, err.seconds * 1000));
    data = await request<Response>("POST", "/chat/completions", body);
  }
  return {
    text: (data.choices?.[0]?.message?.content ?? "").trim(),
    toolCalls: data.choices?.[0]?.message?.tool_calls ?? [],
    model: data.model ?? model,
    usage: { promptTokens: data.usage?.prompt_tokens ?? 0, completionTokens: data.usage?.completion_tokens ?? 0 },
  };
}

/** Chat completion, falling back to a live model if the configured one was retired. */
export async function chatCompletion(
  messages: ChatMessage[],
  { maxTokens = 500, tools }: { maxTokens?: number; tools?: ToolDefinition[] } = {},
): Promise<Completion> {
  try {
    return await complete(messages, DEFAULT_MODEL, maxTokens, tools);
  } catch (err) {
    if (!(err instanceof ModelUnavailable)) throw err;
    const live = await availableModels();
    const replacement = FALLBACK_MODELS.find((m) => live.has(m) && m !== DEFAULT_MODEL);
    if (!replacement) throw new HttpError(502, "My AI model is unavailable right now.");
    console.warn(`Groq model ${DEFAULT_MODEL} unavailable, using ${replacement}`);
    return complete(messages, replacement, maxTokens, tools);
  }
}

export const TRANSCRIBE_MODEL = process.env.GROQ_TRANSCRIBE_MODEL || "whisper-large-v3-turbo";

/**
 * Speech-to-text with Groq Whisper. `prompt` biases spelling toward words the
 * owner is likely to say (product names, "naira").
 */
export async function transcribe(audio: Blob, filename: string, prompt?: string): Promise<string> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", TRANSCRIBE_MODEL);
  form.append("response_format", "json");
  form.append("temperature", "0");
  if (prompt) form.append("prompt", prompt.slice(0, 600));
  const data = await request<{ text?: string }>("POST", "/audio/transcriptions", form);
  return (data.text ?? "").trim();
}

export const VISION_MODEL = process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";

/** Ask the vision model about an image (data: URL, max ~4 MB). Returns its text answer. */
export async function readImage(imageDataUrl: string, instruction: string, maxTokens = 900): Promise<string> {
  const data = await request<{ choices?: { message?: { content?: string } }[] }>("POST", "/chat/completions", {
    model: VISION_MODEL,
    temperature: 0,
    max_completion_tokens: maxTokens,
    reasoning_format: "hidden",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: instruction },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
  });
  // strip any reasoning the model may still inline
  return (data.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}
