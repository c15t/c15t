<script lang="ts">
	import ConsentManagerProvider from '../../lib/components/manager-provider.svelte';
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

<ConsentManagerProvider {options}>
	<ConsentDialog
		{disableAnimation}
		open
	/>
</ConsentManagerProvider>
