<script lang="ts">
	import { createDevTools } from '@c15t/dev-tools';
	import { onMount, untrack } from 'svelte';

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

	onMount(() => {
		const devTools = createDevTools({
			defaultOpen,
			defaultTab,
			getConsentCategories: () =>
				untrack(
					() => getConsentCategories?.() ?? context.state.consentCategories
				),
			kernel: context.kernel,
			maxEvents,
			position,
		});

		return () => devTools.destroy();
	});
</script>
