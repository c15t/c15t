# Preference center in account settings

Northwind Coffee keeps its consent settings at `/account/privacy`, next to
Profile, Orders and Subscriptions, instead of in a modal. Each category is a
card with its description, the vendors it covers and a switch. The page shows
whether each category is on right now and when the visitor last saved. Save
and "Reject all optional" record the choice.

First-time visitors still get the stock banner in Northwind's colors. Its
Customize button opens the privacy page, and so does the footer's "Privacy
settings" link. PostHog waits for Analytics and Meta Pixel waits for
Marketing.

## Files to read

- `components/privacy-preferences.tsx` is the page. `ConsentWidget.Root`
  supplies the draft, `useConsentDraft()` drives the switches,
  `useExplicitChoice()` gives the save time, and `ConsentWidget.SaveButton`
  and `ConsentWidget.RejectButton` record the choice.
- `components/cookie-banner.tsx` is the stock banner built from its parts so
  Customize can open the page instead of the dialog.
- `components/consent.tsx` sets up `ConsentRoot` with the scripts, vendors,
  category copy and theme from `lib/`.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/showcase-preference-center dev
```

Open http://localhost:3111. The app runs in offline mode: the policy resolves
in the browser and choices stay in that browser, so it works without an
account. For production, replace `offline()` in `components/consent.tsx`
with `hosted({ url: 'https://your-project.inth.app' })` and use your own
PostHog and Meta Pixel IDs in `lib/vendors.ts`.

## Docs

- [ConsentWidget](https://c15t.com/docs/frameworks/next/components/consent-widget)
- [Compose your own banner](https://c15t.com/docs/frameworks/next/compose)
- [Vendor consent](https://c15t.com/docs/frameworks/next/vendor-consent)
