<script lang="ts">
	import ConsentManagerProvider from '../../lib/components/manager-provider.svelte';
	import ConsentDialogTrigger from '../../lib/components/panel-trigger.svelte';
	import ConsentDialog from '../../lib/components/panel.svelte';
	import ConsentBanner from '../../lib/components/prompt.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';

	let {
		options,
		showWhen = 'always' as 'always' | 'never',
	}: {
		options: ConsentManagerOptions;
		showWhen?: 'always' | 'never';
	} = $props();
</script>

<ConsentManagerProvider {options}>
	<ConsentBanner />
	<ConsentDialog />
	<ConsentDialogTrigger {showWhen} />
</ConsentManagerProvider>
