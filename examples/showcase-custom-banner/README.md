# Custom banner

Northwind Coffee's consent UI, built from c15t's headless hooks. c15t decides
when to ask, which buttons the visitor's policy needs and what gets recorded.
The markup, copy and CSS belong to the shop, and the c15t stylesheet is never
loaded.

The prompt is a centered dialog that blocks the page until the visitor
answers. It asks one question, lists the cookie categories, and shows the
actions the policy returns in the order it returns them. Reject and Accept
look the same.

c15t has two surfaces, the banner and the preference dialog, and the policy
gives each its own actions. Save only exists on the second. So the modal has
two steps instead of putting switches on the first one. Choose moves c15t to
the dialog surface, and the same modal turns each category into a switch.
Nothing opens on top of it.

- Escape does nothing while the visitor still owes an answer. On the switch
  step it goes back to the question.
- Privacy settings in the footer opens the switch step with the saved
  choices. There Escape and the close button close the modal and put focus
  back on the link.
- PostHog loads only after the visitor allows Analytics.

## The files that matter

- **`components/consent-dialog.tsx`** is the modal. `useHeadlessConsentUI()`
  says which surface is open and returns each one's `actionGroups`,
  `primaryActions` and `blocking`, plus `performAction` and `closeUI`.
  `ConsentDraftProvider` and `useConsentDraft()` hold the switches until the
  visitor saves. `useFocusTrap` keeps focus inside, and the page behind gets
  `inert` and stops scrolling.
- **`components/consent.tsx`** mounts `ConsentRoot` with the PostHog script
  and `presentation: { prompt: { variant: 'wall' } }`, which makes the first
  step blocking. c15t won't block a notice, so a notice policy gets the same
  modal without the backdrop.
- **`lib/scripts.ts`** declares PostHog as an `after-consent` script in the
  `measurement` category.

The rest is the shop: the product page, header, footer and
`lib/use-presence.ts`, which keeps the modal mounted while it animates out.

## Run it

From the repository root:

```sh
bun install
bun run build:libs
bun run --cwd examples/showcase-custom-banner dev
```

Then open http://localhost:3110.

The app runs c15t in offline mode, so you don't need an account. The policy
ships in the bundle, and choices are stored in the browser with no consent
records. For production, replace the `mode` line in `components/consent.tsx`
with `hosted({ backendURL: 'https://your-project.inth.app' })`.

Set `NEXT_PUBLIC_POSTHOG_KEY` to send events to your own PostHog project.
Without it the app uses a placeholder key. c15t still loads PostHog after you
allow Analytics, and PostHog's config request returns a 404.

## Docs

- [Headless](https://c15t.com/docs/frameworks/next/headless)
- [Hooks](https://c15t.com/docs/frameworks/next/hooks)
- [Banner designs](https://c15t.com/docs/customization/recipes)
- [Offline configuration](https://c15t.com/docs/frameworks/next/data-fetching-reference#offline-configuration)
