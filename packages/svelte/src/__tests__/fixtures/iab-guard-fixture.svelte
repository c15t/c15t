<script lang="ts">
	import IABConsentBanner from '../../lib/components/iab-prompt.svelte';
	import ConsentManagerProvider from '../../lib/components/manager-provider.svelte';
	import ConsentBanner from '../../lib/components/prompt.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';

	let {
		options,
		onError,
	}: {
		options: ConsentManagerOptions;
		onError: (error: unknown) => void;
	} = $props();
</script>

<svelte:boundary onerror={onError}>
	<ConsentManagerProvider {options}>
		<ConsentBanner />
		<IABConsentBanner />
	</ConsentManagerProvider>
</svelte:boundary>
