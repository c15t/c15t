<script lang="ts">
	import ConsentManagerProvider from '../../components/ConsentManagerProvider.svelte';
	import type { ConsentManagerOptions } from '../../types';

	let {
		options,
		label = 'child',
	}: { options: ConsentManagerOptions; label?: string } = $props();
</script>

<ConsentManagerProvider {options}>
	<div data-testid="render-{label}">{label}</div>
</ConsentManagerProvider>
