import type { OcrResponse } from "../../src/data/types.js";
import { readImage } from "../ai/groq.js";
import { getCurrentBusiness } from "../business.js";
import { HttpError, route } from "../http.js";

// Vercel caps request bodies at 4.5 MB; the app resizes photos to ~1600px JPEG first.
const MAX_BYTES = 4_000_000;
const INSTRUCTION = `This is a photo of a small shop owner's record book (sales, stock, expenses, debts), often handwritten.
Transcribe every record line exactly as written, one per line, keeping numbers and amounts as written.
Do not add, guess or explain anything. If a word is unreadable write [?].
If the image is not a page of records, reply with exactly: NO_RECORDS`;

/** POST /api/ocr (multipart, field "image") -> { text } — the lines read from a notebook photo */
export const POST = route(async (request): Promise<OcrResponse> => {
  await getCurrentBusiness(request);
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new HttpError(400, "Send the photo as multipart form data.");
  }
  const image = form.get("image");
  if (!(image instanceof Blob) || image.size === 0) throw new HttpError(400, "No photo received.");
  if (image.size > MAX_BYTES) throw new HttpError(413, "That photo is too large.");
  const type = image.type.startsWith("image/") ? image.type : "image/jpeg";
  const dataUrl = `data:${type};base64,${Buffer.from(await image.arrayBuffer()).toString("base64")}`;
  const text = await readImage(dataUrl, INSTRUCTION);
  return { text: text === "NO_RECORDS" ? "" : text };
});
