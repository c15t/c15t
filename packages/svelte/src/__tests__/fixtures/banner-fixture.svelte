<script lang="ts">
	import type { Model } from '@c15t/core';

	import ConsentManagerProvider from '../../lib/components/manager-provider.svelte';
	import ConsentBanner from '../../lib/components/prompt.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';

	let {
		options,
		models = undefined,
	}: {
		options: ConsentManagerOptions;
		models?: Model[];
	} = $props();
</script>

<ConsentManagerProvider {options}>
	<ConsentBanner {models} />
</ConsentManagerProvider>
