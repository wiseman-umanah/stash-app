import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  ArrowUpIcon,
  BarcodeIcon,
  CalculatorIcon,
  CameraIcon,
  ChatBubbleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  HamburgerIcon,
  MicIcon,
  PaperclipIcon,
  PlusIcon,
  SearchIcon,
  SendPlaneIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Chevron, EmptyState, ListItem, RowBody, RowIcon } from "@/components/ui/list";
import { chatHistory, pageShortcuts, suggestions } from "@/data/mock";
import { cn } from "@/lib/cn";
import { useProducts } from "@/hooks/queries";
import { searchProducts } from "@/lib/products";
import { Calculator } from "./Calculator";
import { useChat } from "./chat-context";
import { ChatMessageView, StashAvatar } from "./ChatMessageView";
import { SheetController } from "./sheet-controller";
import { chipButton, dropdownItem, dropdownMenu } from "./styles";
import { useVoiceRecorder } from "./useVoiceRecorder";

const DESKTOP_QUERY = "(min-width: 1024px)";

const roundButton = "flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full p-0";

/**
 * The global pullable chatbox: compact dock at the bottom of every business
 * page, dragged (or tapped into) to expand to a full-screen conversation.
 */
export function ChatSheet() {
  const chat = useChat();
  const { messages, input, setInput, inputRef, sheetRef } = chat;
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const sheetEl = useRef<HTMLDivElement>(null);
  const footerEl = useRef<HTMLDivElement>(null);
  const handleEl = useRef<HTMLDivElement>(null);
  const threadWrapEl = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SheetController | null>(null);
  const plusMenuEl = useRef<HTMLDivElement>(null);
  const plusBtnEl = useRef<HTMLButtonElement>(null);
  const cameraInputEl = useRef<HTMLInputElement>(null);
  const attachInputEl = useRef<HTMLInputElement>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [plusOpen, setPlusOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);

  const { data: products = [] } = useProducts();
  const voice = useVoiceRecorder({ onFinish: chat.submitVoiceNote, onError: chat.voiceUnavailable });

  // ---- mount the drag controller and expose it to the rest of the app ----
  useEffect(() => {
    const sheet = sheetEl.current;
    const footer = footerEl.current;
    const handle = handleEl.current;
    const inputNode = inputRef.current;
    if (!sheet || !footer || !handle || !inputNode) return;

    const controller = new SheetController({ sheet, footer, handle, input: inputNode }, (expanded) => {
      if (!expanded) setHistoryOpen(false);
    });
    controller.mount();
    controllerRef.current = controller;
    sheetRef.current = {
      expand: () => controller.expand(),
      collapse: () => controller.collapse(),
      isExpanded: () => controller.expanded,
    };
    return () => {
      controller.destroy();
      controllerRef.current = null;
      sheetRef.current = null;
    };
  }, [inputRef, sheetRef]);

  // ---- wide screens: the chat is a permanently open side panel ----
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const apply = () => (mq.matches ? controllerRef.current?.expand() : controllerRef.current?.collapse());
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // ---- phones: a new page always starts with the compact dock showing ----
  useEffect(() => {
    if (window.matchMedia(DESKTOP_QUERY).matches) return;
    controllerRef.current?.collapse();
    controllerRef.current?.reveal();
  }, [pathname]);

  // ---- keep the newest message in view (scrolls only the thread, never the page) ----
  useEffect(() => {
    const wrap = threadWrapEl.current;
    if (!wrap) return;
    // wait a frame so layout (esp. right after auto-expand) has settled before measuring
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => wrap.scrollTo({ top: wrap.scrollHeight, behavior: "smooth" }));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [messages]);

  // ---- close the + menu on any outside click ----
  useEffect(() => {
    if (!plusOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!plusMenuEl.current?.contains(target) && !plusBtnEl.current?.contains(target)) setPlusOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [plusOpen]);

  // ---- # product autocomplete / @ page shortcuts, derived from the input ----
  const productMatches = useMemo(() => {
    const m = input.match(/(^|\s)#(\w*)$/);
    return m && m[2] ? searchProducts(products, m[2], 5) : null;
  }, [input, products]);
  const mentionMatches = useMemo(() => {
    if (/(^|\s)#(\w*)$/.test(input)) return null;
    const m = input.match(/(^|\s)@(\w*)$/);
    if (!m) return null;
    const q = m[2].toLowerCase();
    return pageShortcuts.filter((p) => p.tag.startsWith(q));
  }, [input]);

  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    return q ? chatHistory.filter((c) => c.title.toLowerCase().includes(q)) : chatHistory;
  }, [historyQuery]);

  const hasText = input.trim().length > 0;

  const openHistory = () => {
    setHistoryQuery("");
    setHistoryOpen(true);
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>, fromCamera: boolean) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) chat.attachFile(file, fromCamera);
  };

  return (
    <>
      <div ref={sheetEl} className="chat-sheet compact group print:hidden">
        {/* expanded-only header */}
        <div className="hidden shrink-0 items-center justify-between border-b border-border px-4 pt-4 pb-2.5 group-[.expanded]:flex">
          <button type="button" className={chipButton} onClick={openHistory} aria-label="Chat history">
            <HamburgerIcon />
          </button>
          <div className="flex items-center gap-2">
            <StashAvatar className="h-[26px] w-[26px] rounded-[8px]" imgClassName="h-3.5 w-3.5" />
            <span className="font-display text-[15px] font-bold text-ink">Stash</span>
          </div>
          <button type="button" className={cn(chipButton, "lg:invisible")} onClick={() => chat.collapse()} aria-label="Collapse">
            <ChevronDownIcon />
          </button>
        </div>

        {/* grab handle: padding (not margin) so the whole strip is draggable */}
        <div ref={handleEl} className="cursor-grab pt-0.5 pb-1.5 group-[.expanded]:pt-2 group-[.expanded]:pb-0 lg:hidden" aria-hidden="true">
          <div className="mx-auto h-1 w-[34px] rounded-[3px] bg-border" />
        </div>

        <div ref={threadWrapEl} className="no-scrollbar hidden min-h-0 flex-1 overflow-y-auto p-4 group-[.expanded]:block">
          <div className="flex flex-col">
            {messages.map((m) => (
              <ChatMessageView key={m.id} message={m} onChooseProduct={chat.showProduct} />
            ))}
          </div>
        </div>

        {/* chat history — half-page slide-out with search */}
        <div
          aria-hidden={!historyOpen}
          onClick={(e) => {
            if (e.target === e.currentTarget) setHistoryOpen(false);
          }}
          className={cn(
            "fixed inset-0 z-35 bg-[rgba(10,25,19,0.42)] transition-opacity duration-[250ms] ease-in-out",
            "desk:right-auto desk:left-1/2 desk:w-full desk:max-w-[480px] desk:-translate-x-1/2",
            // desktop: stays inside the docked chat panel
            "lg:absolute lg:right-0 lg:left-0 lg:w-auto lg:max-w-none lg:translate-x-0",
            historyOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <div
            className={cn(
              "absolute top-0 bottom-0 left-0 flex w-[82%] flex-col overflow-y-hidden bg-surface px-3.5 py-4 shadow-[16px_0_40px_-20px_rgba(10,30,22,0.4)] transition-transform duration-[280ms] ease-[cubic-bezier(.32,.72,0,1)]",
              historyOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <div className="flex shrink-0 items-center justify-between px-1 pt-0.5 pb-3.5">
              <h2 className="text-[15px] font-bold text-ink">Chat history</h2>
              <button type="button" className={chipButton} onClick={() => setHistoryOpen(false)} aria-label="Close">
                <CloseIcon />
              </button>
            </div>
            <label className="mb-3 flex shrink-0 items-center gap-2 rounded-[14px] border border-border bg-bg px-3 py-2.5 text-muted-2">
              <SearchIcon />
              <input
                type="text"
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="Search conversations"
                className="flex-1 bg-transparent text-[13.5px] text-ink outline-none"
              />
            </label>
            <div className="flex-1 overflow-y-auto px-0.5 pt-0.5 pb-3">
              {filteredHistory.length === 0 ? (
                <EmptyState>No conversations found.</EmptyState>
              ) : (
                filteredHistory.map((c) => (
                  <ListItem
                    key={c.id}
                    onClick={() => {
                      chat.loadConversation(c);
                      setHistoryOpen(false);
                    }}
                  >
                    <RowIcon>
                      <ChatBubbleIcon />
                    </RowIcon>
                    <RowBody title={c.title} subtitle={c.date} />
                    <Chevron />
                  </ListItem>
                ))
              )}
            </div>
            <div className="p-1">
              <Button
                variant="secondary"
                onClick={() => {
                  chat.startNewChat();
                  setHistoryOpen(false);
                }}
              >
                Start a new chat
              </Button>
            </div>
          </div>
        </div>

        {/* footer: suggestions + input (shared by compact and expanded) */}
        <div ref={footerEl} className="relative shrink-0 pt-1.5 group-[.expanded]:pb-3.5">
          <div className="no-scrollbar hidden gap-2 overflow-x-auto px-0.5 py-1 group-[.expanded]:flex">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => chat.send(s)}
                className="shrink-0 cursor-pointer rounded-[20px] border border-mint bg-accent-tint px-3.5 py-2 text-[12.5px] font-semibold whitespace-nowrap text-primary-dark"
              >
                {s}
              </button>
            ))}
          </div>

          {/* voice recording bar */}
          <div
            className={cn(
              "mt-2 h-[52px] items-center gap-2.5 rounded-[26px] border border-border bg-bg py-1.5 pr-2 pl-4 group-[.expanded]:mx-4",
              voice.recording ? "flex" : "hidden",
            )}
          >
            <button
              type="button"
              onClick={voice.cancel}
              aria-label="Cancel recording"
              className="flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-danger"
            >
              <CloseIcon />
            </button>
            <div className="flex h-[22px] flex-1 items-center gap-[3px]" aria-hidden="true">
              {[0, 0.12, 0.24, 0.36, 0.24, 0.12, 0].map((delay, i) => (
                <span key={i} className="h-[30%] max-w-1 flex-1 animate-voice-pulse rounded-[2px] bg-danger" style={{ animationDelay: `${delay}s` }} />
              ))}
            </div>
            <span className="shrink-0 text-[12.5px] font-bold text-ink tabular-nums">{voice.timer}</span>
            <button
              type="button"
              onClick={voice.finish}
              aria-label="Send recording"
              className="flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary shadow-send"
            >
              <SendPlaneIcon />
            </button>
          </div>

          <div
            className={cn(
              "relative mt-2 h-[52px] items-center gap-2 rounded-[26px] border border-border bg-bg py-1.5 pr-1.5 pl-4 group-[.expanded]:mx-4",
              voice.recording ? "hidden" : "flex",
            )}
          >
            {mentionMatches && mentionMatches.length > 0 && (
              <div className={dropdownMenu}>
                {mentionMatches.map((p) => (
                  <button key={p.tag} type="button" className={dropdownItem} onClick={() => chat.pickMention(p.tag)}>
                    <span className="font-bold text-primary">@{p.tag}</span> {p.label}
                  </button>
                ))}
              </div>
            )}
            {productMatches && productMatches.length > 0 && (
              <div className={dropdownMenu}>
                {productMatches.map((p) => (
                  <button key={p.name} type="button" className={cn(dropdownItem, "justify-between")} onClick={() => chat.pickProductSuggestion(p)}>
                    <span>{p.name}</span>
                    <ChevronRightIcon size={14} className="ml-auto text-muted-2" />
                  </button>
                ))}
              </div>
            )}

            {/* + toolbox */}
            <div
              ref={plusMenuEl}
              className={cn(
                "absolute bottom-full left-0 z-6 mb-2.5 min-w-[190px] flex-col rounded-[18px] border border-border bg-surface p-1.5 shadow-card",
                plusOpen ? "flex" : "hidden",
              )}
            >
              <PlusMenuItem icon={<CameraIcon />} onClick={() => {
                  setPlusOpen(false);
                  cameraInputEl.current?.click();
                }}>
                Camera
              </PlusMenuItem>
              <PlusMenuItem icon={<PaperclipIcon />} onClick={() => {
                  setPlusOpen(false);
                  attachInputEl.current?.click();
                }}>
                Files
              </PlusMenuItem>
              <PlusMenuItem icon={<BarcodeIcon />} onClick={() => {
                  setPlusOpen(false);
                  navigate("/barcode");
                }}>
                Barcode
              </PlusMenuItem>
              <PlusMenuItem icon={<CalculatorIcon />} onClick={() => {
                  setPlusOpen(false);
                  setCalcOpen(true);
                }}>
                Calculator
              </PlusMenuItem>
              <PlusMenuItem
                icon={<span className="font-display text-[15px] font-bold">@</span>}
                onClick={() => {
                  setPlusOpen(false);
                  setInput("@");
                  chat.focusInput();
                }}
              >
                Go to page
              </PlusMenuItem>
            </div>

            <button
              ref={plusBtnEl}
              type="button"
              onClick={() => setPlusOpen((o) => !o)}
              aria-label="More options"
              aria-expanded={plusOpen}
              className={cn(roundButton, "border border-border bg-surface text-primary-dark")}
            >
              <PlusIcon />
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  chat.send();
                }
              }}
              placeholder="Tell Stash..."
              autoComplete="off"
              aria-label="Message Stash"
              className="m-0 h-full min-w-0 flex-1 bg-transparent p-0 text-[14px] leading-none text-ellipsis text-ink outline-none"
            />
            {hasText ? (
              <button type="button" onClick={() => chat.send()} aria-label="Send" className={cn(roundButton, "bg-primary text-white shadow-send")}>
                <ArrowUpIcon />
              </button>
            ) : (
              <button type="button" onClick={() => void voice.start()} aria-label="Record voice note" className={cn(roundButton, "bg-danger shadow-mic")}>
                <MicIcon />
              </button>
            )}
          </div>

          {pathname === "/dashboard" && (
            <div className="mt-2 text-center text-[11px] font-medium tracking-[0.005em] text-muted-2 group-[.expanded]:hidden">
              Just write. Snap and send. Stash handles the rest.
            </div>
          )}
        </div>
      </div>

      <Calculator
        open={calcOpen}
        onClose={() => setCalcOpen(false)}
        onUse={(summary) => {
          setCalcOpen(false);
          chat.expand();
          setInput(summary + " ");
          chat.focusInput();
        }}
      />

      <input ref={cameraInputEl} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e, true)} />
      <input ref={attachInputEl} type="file" accept="image/*,.pdf,.csv,.xlsx" hidden onChange={(e) => onFile(e, false)} />
    </>
  );
}

function PlusMenuItem({ icon, onClick, children }: { icon: ReactNode; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2.5 text-left font-sans text-[13.5px] font-semibold text-ink hover:bg-accent-tint active:bg-accent-tint"
    >
      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] bg-bg text-primary-dark">{icon}</span>
      {children}
    </button>
  );
}
