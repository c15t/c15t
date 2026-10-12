# Gated embeds

A Northwind Coffee journal page with a YouTube video, a Google Map and a
Crisp support chat. None of them loads until the visitor allows it. Each one
waits behind a drawn placeholder that says what loading it sends to whom, and
an Allow and load button that turns on that one consent category and loads
the embed where it sits, without a reload. Turning the category off in
Privacy settings removes the embed. c15t reloads the page at that point, so
code the embed already ran stops too.

Nothing contacts YouTube, Google or Crisp before consent. The placeholders
are inline SVG, not vendor thumbnails.

| Embed | Category | How it is gated |
| --- | --- | --- |
| YouTube video | Marketing | `ConsentGate` around the iframe |
| Google Map | Experience | `ConsentGate` around the iframe |
| Crisp chat | Functionality | `crisp()` from `@c15t/integrations`, with a `ConsentGate` card in the page |

The Crisp helper always uses Functionality. The map sits under Experience so
that allowing the map does not also start the chat. Pick the category that
matches what each embed does in your policy.

## Files that matter

- [`components/gated-embed.tsx`](components/gated-embed.tsx) wraps
  `ConsentGate` with a custom placeholder. Its button calls
  `useSaveConsents()` with the one category the embed needs.
- [`app/page.tsx`](app/page.tsx) puts the video and the map behind
  `GatedEmbed`, and keeps the address, directions and a YouTube link outside
  the gate for visitors who say no.
- [`components/consent.tsx`](components/consent.tsx) mounts `ConsentRoot`
  with the stock banner and dialog, and registers the Crisp script.
  [`components/support-chat.tsx`](components/support-chat.tsx) is the chat's
  placeholder card.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/showcase-gated-embeds dev
```

Open <http://localhost:3112>.

The app runs in offline mode, so it needs no backend: c15t's bundled policy
rules ask for opt-in consent and choices stay in the browser. For production,
replace `offline()` in `components/consent.tsx` with
`hosted({ backendURL: 'https://your-project.inth.app' })` and add your site's origin
to the project's trusted origins.

The chat loads Crisp with a placeholder website ID, so no chat window appears
until you set your own:

```sh
NEXT_PUBLIC_CRISP_WEBSITE_ID=your-website-id bun run --cwd examples/showcase-gated-embeds dev
```

## Docs

- [Embeds in Next.js](https://c15t.com/docs/frameworks/next/embeds)
- [ConsentGate](https://c15t.com/docs/frameworks/next/components/consent-gate)
- [YouTube](https://c15t.com/docs/integrations/youtube),
  [Google Maps](https://c15t.com/docs/integrations/google-maps) and
  [Crisp](https://c15t.com/docs/integrations/crisp)
