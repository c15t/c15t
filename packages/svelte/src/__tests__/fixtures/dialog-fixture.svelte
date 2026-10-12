<script lang="ts">
	import type { Model } from '@c15t/core';

	import ConsentProvider from '../../lib/components/consent-provider.svelte';
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

<ConsentProvider {options}>
	<ConsentDialog
		{open}
		{models}
		{hideBranding}
	/>
</ConsentProvider>
