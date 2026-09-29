<script lang="ts">
	import ConsentManagerProvider from '../../lib/components/manager-provider.svelte';
	import ConsentDialog from '../../lib/components/panel.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';
	import ActiveUiControl from './active-ui-control.svelte';

	let {
		options,
		open = undefined,
	}: {
		options: ConsentManagerOptions;
		open?: boolean;
	} = $props();
</script>

<ConsentManagerProvider {options}>
	<ActiveUiControl />
	<ConsentDialog {open} />
</ConsentManagerProvider>
