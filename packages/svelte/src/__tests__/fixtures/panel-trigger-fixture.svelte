<script lang="ts">
	import { ConsentDialogTrigger } from '../../lib';
	import ConsentManagerProvider from '../../lib/components/manager-provider.svelte';
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
	<ConsentDialogTrigger {showWhen} />
</ConsentManagerProvider>
