# Svelte devtools example

Run `bun run --cwd examples/sveltekit-demo dev` from the repository root.
Open DevTools and select Scripts to inspect ten loading cases.

The demo uses the actual `@c15t/scripts` helpers for Meta Pixel, TikTok Pixel,
Google Tag, and Microsoft Clarity. By default, their SDK URLs point to local
fixtures. Their setup and consent callbacks run, but the fixtures do not send
events to vendor accounts. Script names explicitly identify fixture mode.

To test real SDKs, copy the optional `PUBLIC_*` IDs from `.env.example` into your
local environment and supply dedicated test accounts. Restart the dev server.
Each configured integration switches independently to its vendor URL. Real SDKs
can send telemetry; do not use production account IDs. Meta's automatic PageView
is disabled in this example.

The other cases cover inline execution, callback-only integration, an 800 ms
network delay, an intentional HTTP 503 error, and standard/custom IAB vendor
gates. `intentional-load-error` is expected to fail. IAB fixtures remain blocked
until their vendor requirements are met, independently of category consent.

Check both granting and revoking consent. Meta and TikTok retain their elements
and receive revocation callbacks. Google Tag also exercises its always-loaded
Consent Mode behavior. A loaded fixture proves the loader path worked, not that
a vendor received or accepted an event.

## IAB editor

Run `PUBLIC_DEVTOOLS_IAB=true bun run --cwd examples/sveltekit-demo dev` to
use the local IAB playground. Open DevTools → IAB to edit vendor and purpose
consent, legitimate interest, and special-feature opt-ins. Search by name or ID;
the vendor list is paginated. The two IAB script fixtures respond to your edits.

This mode fetches the vendor list from inth.com and uses the example CMP ID.
Save generates a TC string in memory without contacting the consent backend;
reload resets the playground. It is not a production CMP configuration or a
backend persistence test. Real SDKs still require the explicit test IDs above.

## Consent example

Open `/consent-example` for the shared integration scenario. The existing home
and showcase routes remain available.

For hosted operation, create an [Inth](https://inth.com) project, configure an
opt-in policy covering `measurement` and `marketing`, and allow this app's
origin. Set `PUBLIC_C15T_BACKEND_URL` to the exact public backend URL supplied by Inth.
Then run from the repository root:

```sh
bun run --cwd examples/sveltekit-demo dev
```

Public vendor settings are optional:

- `PUBLIC_POSTHOG_KEY`: PostHog browser project key. The example selects the EU region;
  change `region` in `example-scripts.ts` for a US project.
- `PUBLIC_X_PIXEL_ID`: X Pixel ID, not a conversion event ID.

An unset vendor setting omits that loader. PostHog uses `loadMode: 'after-consent'`
and `cookieless_mode: 'never'`. X Pixel waits for marketing permission. Remove
other initializers for these vendors before reusing the example.

The YouTube nocookie iframe only mounts with measurement permission and is
removed on revocation. The placeholder opens preferences. Use the footer's
Privacy settings control to reopen the dialog. Default theme and Branded theme
buttons demonstrate CSS token overrides without replacing the consent runtime.

Test a fresh rejection, grant, reload and withdrawal. Confirm PostHog and X
requests are absent before their respective permissions, and the iframe is
absent before measurement permission. The example emits no custom conversion
events. Script removal cannot undo SDK code that already ran; application event
calls must also stop after withdrawal.

This route owns a separate standard provider and skips the root IAB showcase
provider and its server load. Without the public backend URL it uses `/api/c15t`.
The existing showcase and benchmark routes retain their original modes.
DevTools is available during development.
