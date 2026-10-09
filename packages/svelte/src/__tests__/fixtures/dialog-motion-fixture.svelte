<script lang="ts">
	import ConsentProvider from '../../lib/components/consent-provider.svelte';
	import ConsentDialog from '../../lib/components/panel.svelte';
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
	<ConsentDialog
		{disableAnimation}
		open
	/>
</ConsentProvider>
