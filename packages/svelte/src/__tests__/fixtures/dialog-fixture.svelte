<script lang="ts">
	import type { Model } from '@c15t/core';

	import ConsentManagerProvider from '../../lib/components/manager-provider.svelte';
	import ConsentDialog from '../../lib/components/panel.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';

	let {
		options,
		open = undefined,
		models = undefined,
		hideBranding = undefined,
	}: {
		options: ConsentManagerOptions;
		open?: boolean;
		models?: Model[];
		hideBranding?: boolean;
	} = $props();
</script>

<ConsentManagerProvider {options}>
	<ConsentDialog
		{open}
		{models}
		{hideBranding}
	/>
</ConsentManagerProvider>
