<script lang="ts">
	import ConsentBanner from '../../lib/components/consent-banner.svelte';
	import ConsentDialogTrigger from '../../lib/components/consent-dialog-trigger.svelte';
	import ConsentDialog from '../../lib/components/consent-dialog.svelte';
	import ConsentManagerProvider from '../../lib/components/consent-manager-provider.svelte';
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
