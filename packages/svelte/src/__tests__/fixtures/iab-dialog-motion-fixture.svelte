<script lang="ts">
	import ConsentProvider from '../../lib/components/consent-provider.svelte';
	import IabConsentDialog from '../../lib/components/iab-panel.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';

	let {
		options,
		disableAnimation = undefined,
	}: {
		options: ConsentManagerOptions;
		disableAnimation?: boolean;
	} = $props();
</script>

<ConsentProvider {options}>
	<IabConsentDialog
		{disableAnimation}
		open
	/>
</ConsentProvider>
