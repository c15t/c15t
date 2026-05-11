# Quickstart

Add c15t to a Svelte app with a single provider and the built-in consent UI.

## Install

```bash
pnpm add @c15t/svelte
```

## Basic setup

Import the package stylesheet once in your global app CSS, then wrap your app with `ConsentProvider` and render the banner and dialog once near the root.

```css
@import "@c15t/svelte/styles.css";
```

Then wire the provider and UI components near the root.

```svelte
<script lang="ts">
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentProvider,
	} from '@c15t/svelte';

	let { children } = $props();
</script>

<ConsentProvider
	options={{
		mode: 'hosted',
		backendURL: 'https://your-instance.c15t.dev',
		consentCategories: ['necessary', 'measurement', 'marketing'],
		overrides: { country: 'DE' },
	}}
>
	{@render children()}
	<ConsentBanner />
	<ConsentDialog />
</ConsentProvider>
```

For SvelteKit, place this in your root `+layout.svelte` or a shared layout wrapper.

For Astro, use the same provider and components inside a Svelte island or shared Svelte layout component.

If you use the IAB banner or dialog, import the IAB stylesheet once too:

```css
@import "@c15t/svelte/iab/styles.css";
```

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

## Next step

Once the package docs grow, this page will link out to server helpers, headless usage, IAB flows, and Astro-specific guidance.
