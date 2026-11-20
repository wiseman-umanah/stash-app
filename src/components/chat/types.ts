import type { Product } from "@/data/types";

export type MessageBody =
  | { kind: "text"; text: string }
  | { kind: "product"; product: Product }
  | { kind: "chooser"; query: string; products: Product[] }
  /** "Stash is thinking" indicator while the AI replies */
  | { kind: "typing" };

export interface ChatMessage {
  id: string;
  from: "user" | "stash";
  body: MessageBody;
  /** data URL of an attached image */
  image?: string;
  /** records the AI saved while producing this message */
  recorded?: string[];
}

export interface SheetHandle {
  expand(): void;
  collapse(): void;
  isExpanded(): boolean;
}
