<script lang="ts">
	import { createDevTools } from '@c15t/dev-tools';
	import { untrack } from 'svelte';

	import { getConsentContext } from '../context.svelte';
	import type { ConsentDevToolsProps } from '../devtools-options';

	let {
		defaultOpen,
		defaultTab,
		getConsentCategories,
		maxEvents,
		position,
	}: ConsentDevToolsProps = $props();
	const context = getConsentContext();
	// Snapshot updates can return a new array with the same categories. Only
	// recreate the inspector when the displayed scope actually changes.
	const categoryKey = $derived(
		JSON.stringify(getConsentCategories?.() ?? context.state.consentCategories)
	);

	$effect(() => {
		const categories = JSON.parse(categoryKey) as ReturnType<
			NonNullable<ConsentDevToolsProps['getConsentCategories']>
		>;
		const options = {
			defaultOpen,
			defaultTab,
			getConsentCategories: () => categories,
			kernel: context.kernel,
			maxEvents,
			position,
		};
		const devTools = untrack(() => createDevTools(options));

		return () => devTools.destroy();
	});
</script>
