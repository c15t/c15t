<script lang="ts">
	import ConsentProvider from '../../lib/components/consent-provider.svelte';
	import ConsentDialog from '../../lib/components/panel.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';
	import ActiveUiControl from './active-ui-control.svelte';

	let {
		options,
		open = undefined,
		showCloseButton = undefined,
	}: {
		options: ConsentManagerOptions;
		open?: boolean;
		showCloseButton?: boolean;
	} = $props();
</script>

<ConsentProvider {options}>
	<ActiveUiControl />
	<ConsentDialog
		{open}
		{showCloseButton}
	/>
</ConsentProvider>
