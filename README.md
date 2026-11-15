# Tatva 🌿

A mobile-first prescription scanner (installable PWA) built for a pharmacy student team project.

Snap a photo of a handwritten prescription and Tatva reads it with a vision AI model, lets you check and correct the medicines, then explains them through four **Tatvas**:

| Tatva | Meaning | What it shows |
| --- | --- | --- |
| **Nidana** (निदान) | Condition | Likely conditions the medicines are for (an estimate, not a diagnosis) |
| **Aushadhi** (औषधि) | Medicine | Daily schedule plus each medicine's strength, dose, timing, food instructions and a plain-language description of what it's for |
| **Aahara** (आहार) | Diet | What to eat, what to avoid, and food/drug interactions |
| **Vihara** (विहार) | Lifestyle | Practical daily habit tips |

The whole UI works in **English and Hindi**. The app asks on first launch and there's an EN / हिं toggle in the header. AI-generated text is returned in both languages, so switching is instant.

Low-confidence readings are highlighted in orange on both the confirm screen and the dashboard, and every result carries a "verify with your pharmacist" note.

## How it works

```
Phone camera / gallery
   │  photo is resized to ≤1600px JPEG in the browser
   ▼
POST /api/scan  (step 1: read)   photo → medicines only, each with the line "as written"
   │
   ▼
Confirm screen  ◄── meanwhile POST /api/insights (step 2: explain, text only)
   │  user checks and edits        descriptions, conditions, diet, interactions, lifestyle
   ▼                               (asked again if the user edited anything)
Dashboard

Each step: Gemini (GEMINI_MODEL, retried twice if busy)
        → Gemini backup (GEMINI_FALLBACK_MODEL) → Groq (GROQ_MODEL) as last resort
```

- **"Written as".** For every medicine the AI first copies the line exactly as it appears on the paper, and the confirm screen shows it under the name. If the AI decoded it into a different medicine, you can see the mismatch.
- **Backup readings are flagged.** If both Gemini models are unavailable and Groq does the reading, every field is marked unclear and a banner asks the user to check everything. These results are not cached, so scanning again later can reach Gemini.
- **Two small steps instead of one big one.** Reading the photo and writing the explanations are separate calls. Each answer stays short (Groq's free tier caps output at about 1000 tokens per minute) and the reading step has less room to invent.

- **Caching by image hash.** The browser keeps the last 10 results keyed by the photo's SHA-256, and the server keeps an in-memory cache too, so re-scanning the same photo doesn't call the AI again.
- **Images are never stored.** The photo only exists in memory for the request. Only the extracted *results* are cached.
- **Indian brands.** The prompt is tuned for Indian brand names (Glycomet, Dolo 650, Pan 40, Telma…) and shorthand (OD, BD, TDS, HS, SOS, 1-0-1).

## Setup

Requires **Node.js 20+**.

```bash
npm install
```

Open `.env` in the project root and paste in your keys:

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | One of the two | Free key from [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | No | Gemini model id. Default `gemini-3.8-flash` |
| `GEMINI_FALLBACK_MODEL` | No | Second Gemini model tried before Groq. Default `gemini-3.5-flash`; set it empty to skip |
| `GEMINI_TEXT_MODEL` | No | Lighter model for the text-only explanation step. Default `gemini-3.5-flash-lite` (higher free limits) |
| `GROQ_API_KEY` | One of the two | Free key from [console.groq.com](https://console.groq.com/keys) |
| `GROQ_MODEL` | No | Groq vision model id. Default `qwen/qwen3.8-27b` |
| `GROQ_TEXT_MODEL` | No | Groq model for the text-only explanation step. Defaults to `GROQ_MODEL` |
| `GROQ_MAX_TOKENS` | No | Output cap per Groq call. Default `1000` (the free-tier limit) |

Either key alone works; with both, Groq is the fallback. If a model name is rejected, check the provider's model list and update the variable. No code change is needed.

`.env` is git-ignored. `.env.example` is the committed template.

## Run locally

```bash
npm run dev
```

Open http://localhost:3000.

**Testing on your phone:** connect the phone to the same Wi-Fi, run `npm run dev`, and open `http://<your-laptop-ip>:3000` on the phone. The camera button works there. (The browser-side result cache needs HTTPS or localhost, so over plain LAN it's skipped; the server cache still works.)

Server logs show which provider answered and why a fallback happened (`[tatva] gemini failed (falling back): …`).

## Deploy to Vercel

1. Push the project to a GitHub repo.
2. On [vercel.com](https://vercel.com), choose **Add New → Project** and import the repo (framework is detected as Next.js).
3. Under **Environment Variables**, add `GEMINI_API_KEY`, `GROQ_API_KEY` and optionally `GEMINI_MODEL` / `GROQ_MODEL`.
4. Click **Deploy**.

Or with the CLI:

```bash
npx vercel
```

```bash
npx vercel env add GEMINI_API_KEY
```

```bash
npx vercel --prod
```

Notes:
- The API routes allow up to 60 s (`maxDuration`). That's within the Hobby plan limit.
- Uploads are compressed in the browser, keeping them well under Vercel's 4.5 MB request limit.
- Once deployed over HTTPS, the app can be installed to the home screen ("Add to Home Screen" / "Install app").

## Project structure

```
src/
  app/
    api/scan/route.ts     step 1: image → medicines (cached by hash)
    api/insights/route.ts step 2: confirmed medicines → explanations
    layout.tsx, page.tsx  shell, fonts (Noto Sans + Devanagari)
    manifest.ts, icon.png, apple-icon.png   PWA manifest, favicon, iOS icon
  components/
    TatvaApp.tsx          flow: scan → confirm → dashboard
    ScanScreen.tsx        camera/upload + laser scan animation
    ConfirmScreen.tsx     editable medicines, low-confidence highlighting
    Dashboard.tsx         the four Tatvas
    Header.tsx            logo, language toggle, first-run language picker
  lib/
    ai.ts                 prompts, Gemini retries → Groq fallback chain
    normalize.ts          validates/coerces model output
    model.ts              shared types
    i18n.tsx              English/Hindi strings and language context
    client.ts             image compression, hashing, local result cache
    server.ts             server cache + error responses
public/brand/             logo (tatva-logo.jpg), emblem crop and PWA icons
public/sw.js              offline app shell (never caches /api)
```

## Disclaimer

Tatva is a student project and an AI reading aid. It can misread prescriptions. It is not a medical device and does not replace a pharmacist or doctor. Always verify medicines with a qualified professional.
