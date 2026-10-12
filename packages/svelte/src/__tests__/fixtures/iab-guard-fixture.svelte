<script lang="ts">
	import ConsentProvider from '../../lib/components/consent-provider.svelte';
	import IABConsentBanner from '../../lib/components/iab-prompt.svelte';
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
	<ConsentProvider {options}>
		<ConsentBanner />
		<IABConsentBanner />
	</ConsentProvider>
</svelte:boundary>
