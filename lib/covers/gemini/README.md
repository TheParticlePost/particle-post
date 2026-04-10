# Gemini 2.5 Flash Image client

Thin wrapper around `@google/genai` for text-to-image generation in Mode E
(background-image) covers.

## Environment

Set `GEMINI_API_KEY` in `.env` or the shell. The client will throw a clear
error if it is missing.

## Model

Default: `gemini-2.5-flash-image` (aka "Nano Banana"). The backend currently
resolves this to `gemini-2.5-flash-preview-image` — visible in quota error
messages. Override via the `model` option. Newer preview models like
`gemini-3.1-flash-image-preview` (4K support, released Feb 2026) can be used
if the account has access.

## Billing required

As of April 2026, image generation has **zero free-tier quota** — a 429
`RESOURCE_EXHAUSTED` with `limit: 0` on `generate_content_free_tier_requests`
means billing is not enabled on the underlying Google Cloud project. Enable
billing at https://console.cloud.google.com/billing on the project tied to
the API key (find it via https://aistudio.google.com/apikey).

## Request shape

```ts
await ai.models.generateContent({
  model: "gemini-2.5-flash-image",
  contents: "Editorial photograph of ...",
});
```

The client walks `response.candidates[*].content.parts[*].inlineData` for
the first part whose `mimeType` starts with `image/`, decodes the base64,
and writes a PNG to `os.tmpdir()/gemini-{sha1(prompt).slice(0,10)}.png`.

## Aspect ratio

Gemini does not accept an explicit aspect-ratio parameter. The template
(`templates/background-image.ts`) applies `object-fit: cover` on the
image so any returned ratio crops cleanly to the 1200×628 cover.

## Prompt guidance

Include `"no text, no typography, no logos"` — the model otherwise tends
to hallucinate text in generated images.

## Rate limits & pricing

As of late 2025: ~$0.039/image on paid plans, ~1500 requests/day on the
free tier. 429 errors bubble up unchanged.
