<script lang="ts">
	import { createDevTools } from '@c15t/dev-tools';
	import { onMount } from 'svelte';

	import { getConsentKernel } from '../context.svelte';
	import type { ConsentDevToolsProps } from '../devtools-options';

	let { defaultOpen, defaultTab, maxEvents, position }: ConsentDevToolsProps =
		$props();
	const kernel = getConsentKernel();

	onMount(() => {
		const devTools = createDevTools({
			defaultOpen,
			defaultTab,
			kernel,
			maxEvents,
			position,
		});

		return () => devTools.destroy();
	});
</script>
