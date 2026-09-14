<script lang="ts">
	import ConsentManagerProvider from '../../lib/components/manager-provider.svelte';
	import ConsentDialogLink from '../../lib/components/panel-link.svelte';
	import ConsentDialog from '../../lib/components/panel.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';

	let {
		options,
		styled = false,
	}: { options: ConsentManagerOptions; styled?: boolean } = $props();
</script>

<ConsentManagerProvider {options}>
	<ConsentDialogLink noStyle={!styled}>Manage Preferences</ConsentDialogLink>
	<ConsentDialog />
</ConsentManagerProvider>
