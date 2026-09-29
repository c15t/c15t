<script lang="ts">
	import { ConsentBanner } from '@c15t/svelte';
	import type { ConsentManagerOptions } from '@c15t/svelte';
	import type { Component } from 'svelte';

	import { editableConsentOptions } from './storybook-consent-fixtures';
	import StorybookConsentProvider from './StorybookConsentProvider.svelte';
	import StorybookIABProvider from './StorybookIABProvider.svelte';

	/**
	 * Renders one file from `docs-examples/` inside a provider with an
	 * in-memory policy, so the docs publish code that Storybook exercises.
	 */
	let {
		example,
		iab = false,
		options = {},
		withBanner = false,
	}: {
		example: Component;
		iab?: boolean;
		options?: Partial<ConsentManagerOptions>;
		/** Also render the stock banner, for examples that react to a choice. */
		withBanner?: boolean;
	} = $props();

	const Example = $derived(example);
</script>

{#if iab}
	<StorybookIABProvider>
		<Example />
	</StorybookIABProvider>
{:else}
	<StorybookConsentProvider options={{ ...editableConsentOptions, ...options }}>
		<div style="padding: 2rem;">
			<Example />
		</div>
		{#if withBanner}
			<ConsentBanner />
		{/if}
	</StorybookConsentProvider>
{/if}
