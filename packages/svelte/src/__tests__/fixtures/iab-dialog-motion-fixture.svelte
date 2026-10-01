<script lang="ts">
	import IabConsentDialog from '../../lib/components/iab-panel.svelte';
	import ConsentManagerProvider from '../../lib/components/manager-provider.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';

	let {
		options,
		disableAnimation = undefined,
	}: {
		options: ConsentManagerOptions;
		disableAnimation?: boolean;
	} = $props();
</script>

<ConsentManagerProvider {options}>
	<IabConsentDialog
		{disableAnimation}
		open
	/>
</ConsentManagerProvider>
