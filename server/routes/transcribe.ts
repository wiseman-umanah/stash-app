import { eq } from "drizzle-orm";
import type { TranscribeResponse } from "../../src/data/types.js";
import { transcribe } from "../ai/groq.js";
import { getCurrentBusiness } from "../business.js";
import { getDb, schema } from "../db/client.js";
import { HttpError, route } from "../http.js";

// Vercel caps request bodies at 4.5 MB; a 2-minute Opus voice note is ~0.5 MB.
const MAX_BYTES = 4_000_000;

/** POST /api/transcribe (multipart, field "audio") -> { text } */
export const POST = route(async (request): Promise<TranscribeResponse> => {
  const biz = await getCurrentBusiness(request);
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new HttpError(400, "Send the voice note as multipart form data.");
  }
  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) throw new HttpError(400, "No audio received.");
  if (audio.size > MAX_BYTES) throw new HttpError(413, "That voice note is too long. Keep it under 2 minutes.");

  // help Whisper spell this shop's products correctly
  const names = await getDb().select({ name: schema.products.name }).from(schema.products).where(eq(schema.products.businessId, biz.id)).limit(40);
  const hint = `Shop owner talking about sales, stock and expenses in naira. Products: ${names.map((n) => n.name).join(", ")}.`;

  const type = audio.type || "audio/webm";
  const ext = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : "webm";
  return { text: await transcribe(audio, `voice-note.${ext}`, hint) };
});
