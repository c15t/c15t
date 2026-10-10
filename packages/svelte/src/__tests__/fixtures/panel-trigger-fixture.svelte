<script lang="ts">
	import { ConsentDialogTrigger } from '../../lib';
	import ConsentProvider from '../../lib/components/consent-provider.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';

	let {
		options,
		showWhen = 'always' as 'always' | 'never',
	}: {
		options: ConsentManagerOptions;
		showWhen?: 'always' | 'never';
	} = $props();
</script>

<ConsentProvider {options}>
	<ConsentDialogTrigger {showWhen} />
</ConsentProvider>
