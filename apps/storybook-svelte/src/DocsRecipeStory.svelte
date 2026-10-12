<script lang="ts">
	import { ConsentDialog } from '@c15t/svelte';
	import type { ConsentManagerOptions } from '@c15t/svelte';
	import type { Component } from 'svelte';

	import RecipePage from './docs-recipe-page.svelte';
	import { editableConsentOptions } from './storybook-consent-fixtures';
	import StorybookConsentProvider from './StorybookConsentProvider.svelte';

	let {
		recipe,
		options = {},
	}: {
		recipe: Component;
		options?: Partial<ConsentManagerOptions>;
	} = $props();

	const Recipe = $derived(recipe);
</script>

<StorybookConsentProvider options={{ ...editableConsentOptions, ...options }}>
	<RecipePage>
		<Recipe />
		<ConsentDialog />
	</RecipePage>
</StorybookConsentProvider>
