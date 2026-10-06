<script lang="ts">
	import ConsentManagerProvider from '../../lib/components/manager-provider.svelte';
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

<ConsentManagerProvider {options}>
	<EnabledReader />
</ConsentManagerProvider>
