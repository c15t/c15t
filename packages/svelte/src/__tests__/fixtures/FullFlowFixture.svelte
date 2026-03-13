<script lang="ts">
	import ConsentManagerProvider from '../../components/ConsentManagerProvider.svelte';
	import ConsentBanner from '../../components/ConsentBanner.svelte';
	import ConsentDialog from '../../components/ConsentDialog.svelte';
	import ConsentDialogTrigger from '../../components/ConsentDialogTrigger.svelte';
	import type { ConsentManagerOptions } from '../../types';

	let {
		options,
		showWhen = 'always' as 'always' | 'after-consent' | 'never',
	}: {
		options: ConsentManagerOptions;
		showWhen?: 'always' | 'after-consent' | 'never';
	} = $props();
</script>

<ConsentManagerProvider {options}>
	<ConsentBanner />
	<ConsentDialog />
	<ConsentDialogTrigger {showWhen} />
</ConsentManagerProvider>
