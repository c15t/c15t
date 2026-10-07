# IAB TCF for an ad-supported publisher

A Northwind Journal article with two ad slots and a sponsored story. c15t
shows the IAB TCF banner, writes the visitor's choice as a TC string and
serves it through `window.__tcfapi`. Each slot reads that string the way an
ad tag does and fills only when its vendor and the purposes it needs have
consent. Reject, and the slots stay empty.

The slots ask for different things, so a visitor can allow some and not
others:

| Slot | Vendor | Purposes it needs |
| --- | --- | --- |
| Banner ad above the article | Larkspur Ad Server (1) | 1, 2: device storage, ads from limited data |
| Ad beside the article | Harbor Exchange (2) | 1, 3, 4: device storage, ad profiles |
| Sponsored story | Fieldnote Native (3) | 1, 2, 7: as above, plus ad measurement |

Turn off "Create profiles for personalised advertising" in the preference
center and only the Harbor Exchange slot empties. The "Your ad choices" panel
reads the same string and lists which partner may serve.

`ConsentGPP` publishes the same TC string through `window.__gpp`, as the
`tcfeuv2` section, for ad tech that reads GPP.

The advertisers, the vendors and their creatives are made up. The creatives
are drawn with CSS and nothing contacts an ad network.

## Files that matter

- [`components/consent.tsx`](components/consent.tsx) mounts `ConsentRoot`
  with an IAB policy, then `IABProvider`, `IABConsentBanner` and
  `IABConsentDialog`, and `ConsentGPP`.
- [`lib/use-tcf-data.ts`](lib/use-tcf-data.ts) listens to `__tcfapi` and
  decides whether a vendor may serve. It calls the same API Google Publisher
  Tag and Prebid.js call, and has no c15t code in it.
  [`components/ad-slot.tsx`](components/ad-slot.tsx) reserves the space and
  renders the creative once it may.
- [`public/vendor-list.json`](public/vendor-list.json) is a three-vendor
  Global Vendor List, so the demo runs offline.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/showcase-iab dev
```

Then open http://localhost:3114.

## Before you ship

This demo runs in offline mode, with a local vendor list and a demonstration
CMP ID. A real site changes three things in `components/consent.tsx`:

- **Mode.** Swap `offline()` for `hosted({ url: 'https://your-project.inth.app' })`.
  Your backend then resolves the visitor's region, so only visitors under an
  IAB policy see the TCF banner, and sends the official vendor list with it.
- **Vendor list.** Remove `gvlURL`. c15t loads the official Global Vendor
  List from your backend, or from its GVL endpoint without one. Use the
  `vendors` prop to list only the vendors you work with.
- **CMP ID.** Replace `160` with the ID IAB Europe assigned when your CMP
  registered at [register.consensu.org/CMP](https://register.consensu.org/CMP).
  Every TC string names the CMP that wrote it.

Docs: [IAB TCF in Next.js](https://c15t.com/docs/frameworks/next/iab) and
[IAB GPP in Next.js](https://c15t.com/docs/frameworks/next/gpp).
