# Quickstart

Add c15t to a Svelte app with a single provider and the built-in consent UI.

## Install

```bash
pnpm add @c15t/svelte
```

## Basic setup

Import the package stylesheet once in your global app CSS, then wrap your app with `ConsentManagerProvider` and render the banner and dialog once near the root.

```css
@import "@c15t/svelte/styles.css";
```

Then wire the provider and UI components near the root.

```svelte
<script lang="ts">
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentManagerProvider,
	} from '@c15t/svelte';
</script>

<ConsentManagerProvider
	options={{
		mode: 'hosted',
		backendURL: 'https://your-instance.c15t.dev',
		consentCategories: ['necessary', 'measurement', 'marketing'],
		overrides: { country: 'DE' },
	}}
>
	<slot />
	<ConsentBanner />
	<ConsentDialog />
</ConsentManagerProvider>
```

For SvelteKit, place this in your root `+layout.svelte` or a shared layout wrapper.

For Astro, use the same provider and components inside a Svelte island or shared Svelte layout component.

## What to check

- The banner renders on first load.
- Opening preferences shows the built-in dialog.
- Accepting or rejecting consent persists across reloads.

## Next step

Once the package docs grow, this page will link out to server helpers, headless usage, IAB flows, and Astro-specific guidance.
