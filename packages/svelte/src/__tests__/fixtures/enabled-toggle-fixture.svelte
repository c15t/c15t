<script lang="ts">
	import ConsentProvider from '../../lib/components/consent-provider.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';
	import EnabledReader from './enabled-reader.svelte';

	let {
		enabled,
		mode,
	}: {
		enabled: boolean;
		mode: ConsentManagerOptions['mode'];
	} = $props();

	const options = $derived({ enabled, mode } as ConsentManagerOptions);
</script>

<ConsentProvider {options}>
	<EnabledReader />
</ConsentProvider>
