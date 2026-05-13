# Quickstart

Add c15t to a Svelte app with a single provider and the built-in consent UI.

## Install

```bash
pnpm add @c15t/svelte
```

## Basic setup

Import the package stylesheet once in your global app CSS, then wrap your app with `ConsentManagerProvider` and render the banner and dialog once near the root.

```css
/* src/app.css */
@import "@c15t/svelte/styles.css";
```

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentManagerProvider,
	} from '@c15t/svelte';
	import '../app.css';

	let { children } = $props();
</script>

<ConsentManagerProvider
	mode="hosted"
	backendURL="https://your-instance.c15t.dev"
	consentCategories={['necessary', 'measurement', 'marketing']}
>
	{@render children()}
	<ConsentBanner />
	<ConsentDialog />
</ConsentManagerProvider>
```

Top-level props are the canonical configuration form. If you have a shared config object you want to pass around, you can also use `options={...}`; matching top-level props win over fields from `options`.

For SvelteKit, place this in your root `+layout.svelte`. For Astro, use the same provider and components inside a Svelte island or shared Svelte layout component.

If you use the IAB banner or dialog, import the IAB stylesheet once too:

```css
/* src/app.css */
@import "@c15t/svelte/iab/styles.css";
```

## Reading and updating consent

Call `getConsentManager()` inside any component beneath `<ConsentManagerProvider>` to access reactive state and mutators. It's the equivalent of React's `useConsentManager()`.

```svelte
<script lang="ts">
	import { getConsentManager } from '@c15t/svelte';

	const consent = getConsentManager();
</script>

<!-- Read reactive state -->
{#if consent.consents.marketing}
	<p>Marketing tracking enabled.</p>
{/if}

<!-- Mutate -->
<button onclick={() => consent.setConsent('marketing', true)}>
	Enable marketing
</button>

<button onclick={() => consent.setActiveUI('dialog')}>
	Manage preferences
</button>

<button onclick={() => consent.saveConsents('all')}>
	Accept all
</button>
```

Common members of the returned controller:

| Member | Purpose |
| --- | --- |
| `consents` | Reactive `Readonly<ConsentState>` keyed by category. |
| `activeUI` | Currently visible surface: `'banner' \| 'dialog' \| 'none'`. |
| `hasConsented()` | `true` once the user has saved a choice. |
| `setConsent(name, value)` | Set a single category. |
| `setSelectedConsent(name, value)` | Update the in-flight preference draft (does not persist). |
| `saveConsents('all' \| 'custom' \| 'necessary')` | Persist a choice and dismiss the UI. |
| `setActiveUI('banner' \| 'dialog' \| 'none')` | Show or hide a surface. |
| `setLanguage(code)` | Re-init with a new locale. |

## Which helper do I need?

The package exposes five context helpers. Pick the smallest one that fits.

| Helper | Returns | Use when |
| --- | --- | --- |
| `getConsentManager()` | Reactive controller with state + mutators. | Most components. |
| `getConsentKernel()` | Raw `ConsentKernel`. | You need low-level kernel commands (`identify`, custom subscribers, etc.). |
| `getSnapshot()` | Immutable `ConsentSnapshot`. | One-shot read in `onMount`; no reactivity. |
| `getIAB()` | `SvelteIABState \| null`. | Building IAB TCF UIs. |
| `getHeadlessConsent()` | Surface state + actions for custom UIs. | Building your own banner / dialog from scratch. |

## SvelteKit SSR (optional)

Prefetch consent on the server so the banner doesn't flash on first paint, and so geo-aware policies are correct before hydration.

```ts
// src/routes/+layout.server.ts
import { prefetchInitialConsent } from '@c15t/svelte/server';

export const load = async ({ request, fetch }) => {
	const prefetch = await prefetchInitialConsent({
		backendURL: 'https://your-instance.c15t.dev',
		headers: request.headers,
		fetch,
	});
	return { prefetch };
};
```

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import { ConsentBanner, ConsentDialog, ConsentManagerProvider } from '@c15t/svelte';
	import '../app.css';

	let { data, children } = $props();
</script>

<ConsentManagerProvider
	mode="hosted"
	backendURL="https://your-instance.c15t.dev"
	prefetch={data.prefetch}
>
	{@render children()}
	<ConsentBanner />
	<ConsentDialog />
</ConsentManagerProvider>
```

`prefetchInitialConsent` extracts country/region from edge headers (`x-vercel-ip-country`, `cf-ipcountry`, …), parses the consent cookie, and resolves the policy via your backend. The result is a `KernelConfig` you pass straight into `prefetch`. If only the cookie/header parsing is wanted, use `readInitialConsentConfig` instead.

## Conditional content with `Frame`

Use `Frame` to wrap third-party embeds (analytics, video, maps) that should only render once the user has consented to the relevant category.

```svelte
<script lang="ts">
	import { Frame } from '@c15t/svelte';
</script>

<Frame category="measurement">
	{#snippet children()}
		<!-- Renders only when measurement consent is granted -->
		<iframe src="https://example.com/analytics" title="Analytics" />
	{/snippet}
	{#snippet placeholder()}
		<p>Enable measurement cookies to view analytics.</p>
	{/snippet}
</Frame>
```

If `placeholder` is omitted, `Frame` renders a default prompt that opens the consent dialog.

## Internationalisation

Pass message bundles via `i18n`. The locale is picked from the user's browser unless overridden.

```svelte
<script lang="ts">
	import { baseTranslations } from '@c15t/translations/all';
</script>

<ConsentManagerProvider
	mode="hosted"
	backendURL="https://your-instance.c15t.dev"
	i18n={{
		locale: 'de',
		messages: {
			en: baseTranslations.en,
			de: baseTranslations.de,
			fr: baseTranslations.fr,
		},
	}}
>
	{@render children()}
	<ConsentBanner />
	<ConsentDialog />
</ConsentManagerProvider>
```

Switch languages at runtime with `consent.setLanguage('fr')`.

## Svelte-native primitives

The low-level primitives use Svelte bindings for controlled state:

```svelte
<script lang="ts">
	import { Switch, Tabs } from '@c15t/svelte';

	let analytics = $state(false);
	let tab = $state<string | null>('purposes');
</script>

<Switch.Root bind:checked={analytics} aria-label="Analytics cookies">
	<Switch.Control>
		<Switch.Thumb />
	</Switch.Control>
</Switch.Root>

<Tabs.Root bind:value={tab}>
	<Tabs.List>
		<Tabs.Trigger value="purposes">Purposes</Tabs.Trigger>
		<Tabs.Trigger value="vendors">Vendors</Tabs.Trigger>
	</Tabs.List>
	<Tabs.Content value="purposes">Purpose preferences</Tabs.Content>
	<Tabs.Content value="vendors">Vendor preferences</Tabs.Content>
</Tabs.Root>
```

Use `bind:open` with `Dialog.Root`, `Collapsible.Root`, and `PreferenceItem.Root`; use `bind:value` with `Accordion.Root`.

## What to check

- The banner renders on first load.
- Opening preferences shows the built-in dialog.
- Accepting or rejecting consent persists across reloads.
- With SSR `prefetch`, no banner flash on first paint.
