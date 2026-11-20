import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { chatHistory, pageShortcuts } from "@/data/mock";
import type { ChatResponse, ChatTurn, Conversation, OcrResponse, Product, TranscribeResponse } from "@/data/types";
import { useProducts } from "@/hooks/queries";
import { useProfile } from "@/hooks/useProfile";
import { api } from "@/lib/api";
import { getGreeting } from "@/lib/format";
import { resizeImage } from "@/lib/image";
import { searchProducts, stockLine } from "@/lib/products";
import { ChatContext, type ChatContextValue } from "./chat-context";
import type { ChatMessage, MessageBody, SheetHandle } from "./types";

let nextId = 0;
const newId = () => `m${++nextId}`;

const fromHistory = (convo: Conversation): ChatMessage[] =>
  convo.messages.map((m) => ({ id: newId(), from: m.from, body: { kind: "text", text: m.text } }));

/** How many recent messages go to the AI as conversation history. */
const HISTORY_TURNS = 12;

/** Turns the visible thread into plain-text turns the AI can read. */
function toTurns(messages: ChatMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const m of messages) {
    const role = m.from === "user" ? "user" : "assistant";
    const b = m.body;
    let content: string | null = null;
    if (b.kind === "text") content = m.recorded?.length ? `${b.text}\n[Recorded: ${m.recorded.join("; ")}]` : b.text;
    else if (b.kind === "product") content = `[Showed product details: ${b.product.name}, ${stockLine(b.product)} in stock]`;
    else if (b.kind === "chooser") content = `[Listed products matching "${b.query}": ${b.products.map((p) => p.name).join(", ")}]`;
    if (content) turns.push({ role, content });
  }
  return turns.slice(-HISTORY_TURNS);
}

const readAsDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/**
 * Holds the conversation and every chat action. Lives above the router outlet
 * so the thread survives navigating between pages; the sheet UI itself
 * (ChatSheet) registers into `sheetRef` while it's mounted.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { firstName } = useProfile();
  // # search runs over the real product list
  const { data: products = [] } = useProducts();
  const [messages, setMessages] = useState<ChatMessage[]>(() => fromHistory(chatHistory[0]));
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const sheetRef = useRef<SheetHandle | null>(null);
  // latest thread, readable from async callbacks without re-creating them
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const push = useCallback((from: ChatMessage["from"], body: MessageBody, image?: string) => {
    const id = newId();
    setMessages((prev) => [...prev, { id, from, body, image }]);
    return id;
  }, []);
  const pushText = useCallback((from: ChatMessage["from"], text: string) => push(from, { kind: "text", text }), [push]);
  const remove = useCallback((id: string) => setMessages((prev) => prev.filter((m) => m.id !== id)), []);

  const expand = useCallback(() => sheetRef.current?.expand(), []);
  const collapse = useCallback(() => sheetRef.current?.collapse(), []);
  const focusInput = useCallback(() => inputRef.current?.focus(), []);

  const showProduct = useCallback((product: Product) => push("stash", { kind: "product", product }), [push]);

  /** Sends the owner's message (plus recent history) to the AI and shows its reply. */
  const askStash = useCallback(
    async (text: string) => {
      const history = toTurns(messagesRef.current);
      const typingId = push("stash", { kind: "typing" });
      try {
        const res = await api.post<ChatResponse>("chat", { messages: [...history, { role: "user", content: text }] });
        remove(typingId);
        setMessages((prev) => [...prev, { id: newId(), from: "stash", body: { kind: "text", text: res.reply }, recorded: res.recorded }]);
        // something was saved: refresh every screen that shows records
        if (res.changed.length) void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "me" });
      } catch (err) {
        remove(typingId);
        pushText("stash", err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    },
    [push, pushText, remove, queryClient],
  );

  const send = useCallback(
    (override?: string) => {
      const text = (override ?? input).trim();
      if (!text) return;

      // "@sales" on its own navigates to that page
      const mention = text.match(/^@(\w+)$/);
      if (mention) {
        const page = pageShortcuts.find((p) => p.tag === mention[1].toLowerCase());
        if (page) {
          setInput("");
          collapse();
          navigate(page.path);
          return;
        }
      }

      expand();
      pushText("user", text);
      setInput("");

      // Message is exactly "#query" — posted as-is, then Stash searches in the chat
      const hashCommand = text.match(/^#(\S.*)$/);
      if (hashCommand) {
        const query = hashCommand[1];
        window.setTimeout(() => {
          const results = searchProducts(products, query, 5);
          if (results.length === 0) pushText("stash", `I couldn't find any products matching "${query}".`);
          else push("stash", { kind: "chooser", query, products: results });
        }, 450);
        return;
      }

      // # used inline in a sentence, e.g. "How many do I have of #mlk?" —
      // resolve directly when there's one clear match, otherwise ask; never guess.
      const inlineHash = text.match(/#(\w+)/);
      if (inlineHash) {
        const query = inlineHash[1];
        const results = searchProducts(products, query, 5);
        window.setTimeout(() => {
          if (results.length === 1) {
            const product = results[0];
            if (/how many|stock|left|remaining/i.test(text)) pushText("stash", `${product.name}: ${stockLine(product)}.`);
            else showProduct(product);
          } else if (results.length > 1) {
            pushText("stash", `A few products could match #${query} — did you mean one of these?`);
            window.setTimeout(() => push("stash", { kind: "chooser", query, products: results }), 250);
          } else {
            pushText("stash", `I couldn't find a product matching #${query}.`);
          }
        }, 450);
        return;
      }

      void askStash(text);
    },
    [input, products, askStash, collapse, expand, navigate, push, pushText, showProduct],
  );

  const pickMention = useCallback(
    (tag: string) => {
      setInput(`@${tag} `);
      focusInput();
    },
    [focusInput],
  );

  const pickProductSuggestion = useCallback(
    (product: Product) => {
      setInput("");
      expand();
      pushText("user", `#${product.name}`);
      window.setTimeout(() => showProduct(product), 400);
    },
    [expand, pushText, showProduct],
  );

  // Notebook photo: read by Groq's vision model, shown back to the owner, and
  // recorded by the AI only after they confirm ("yes").
  const attachFile = useCallback(
    async (file: File, fromCamera: boolean) => {
      let dataUrl: string;
      try {
        dataUrl = await readAsDataURL(file);
      } catch {
        return;
      }
      expand();
      push("user", { kind: "text", text: fromCamera ? "Snapped a photo of my notebook" : `Attached ${file.name}` }, dataUrl);

      if (!file.type.startsWith("image/")) {
        pushText("stash", "I can only read photos for now. Snap or attach a picture of the notebook page and I'll read it.");
        return;
      }
      const readingId = pushText("stash", "Reading your notebook…");
      try {
        const form = new FormData();
        form.append("image", await resizeImage(file), "notebook.jpg");
        const { text } = await api.upload<OcrResponse>("ocr", form);
        remove(readingId);
        if (!text) {
          pushText("stash", "I couldn't find any records in that photo. Try a clearer picture of the page, in good light.");
          return;
        }
        pushText(
          "stash",
          `Here's what I read from your notebook:\n\n${text}\n\nShould I record these? Reply "yes", or tell me what to fix.`,
        );
      } catch (err) {
        remove(readingId);
        pushText("stash", err instanceof Error ? err.message : "I couldn't read that photo. Please try again.");
      }
    },
    [expand, push, pushText, remove],
  );

  // Voice note: transcribed by Groq Whisper, then handled exactly like typed text
  // (so "I sold 3 cartons of Indomie for 40,500" gets recorded too).
  const submitVoiceNote = useCallback(
    async (audio: Blob) => {
      expand();
      const transcribingId = pushText("stash", "Transcribing your voice note…");
      const ext = audio.type.includes("mp4") ? "mp4" : audio.type.includes("ogg") ? "ogg" : "webm";
      const form = new FormData();
      form.append("audio", audio, `voice-note.${ext}`);
      try {
        const { text } = await api.upload<TranscribeResponse>("transcribe", form);
        remove(transcribingId);
        if (!text) {
          pushText("stash", "I couldn't hear anything in that voice note. Try again a bit closer to the phone.");
          return;
        }
        pushText("user", text);
        await askStash(text);
      } catch (err) {
        remove(transcribingId);
        pushText("stash", err instanceof Error ? err.message : "I couldn't transcribe that voice note. Please try again.");
      }
    },
    [askStash, expand, pushText, remove],
  );

  const voiceUnavailable = useCallback(() => {
    expand();
    pushText("stash", "I couldn't access your microphone. Check your browser's microphone permission and try again.");
  }, [expand, pushText]);

  const loadConversation = useCallback((convo: Conversation) => setMessages(fromHistory(convo)), []);

  const startNewChat = useCallback(() => {
    const timeOfDay = getGreeting().split(" ")[1];
    setMessages([{ id: newId(), from: "stash", body: { kind: "text", text: `Good ${timeOfDay}, ${firstName}. What would you like to know?` } }]);
  }, [firstName]);

  const reset = useCallback(() => {
    setMessages(fromHistory(chatHistory[0]));
    setInput("");
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({
      messages,
      input,
      setInput,
      inputRef,
      sheetRef,
      expand,
      collapse,
      focusInput,
      push,
      pushText,
      remove,
      send,
      pickMention,
      pickProductSuggestion,
      showProduct,
      attachFile: (file, fromCamera) => void attachFile(file, fromCamera),
      submitVoiceNote: (audio) => void submitVoiceNote(audio),
      voiceUnavailable,
      loadConversation,
      startNewChat,
      reset,
    }),
    [
      messages,
      input,
      expand,
      collapse,
      focusInput,
      push,
      pushText,
      remove,
      send,
      pickMention,
      pickProductSuggestion,
      showProduct,
      attachFile,
      submitVoiceNote,
      voiceUnavailable,
      loadConversation,
      startNewChat,
      reset,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
