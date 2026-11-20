<script lang="ts">
	import ConsentProvider from '../../lib/components/consent-provider.svelte';
	import ConsentBanner from '../../lib/components/prompt.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';

	let {
		options,
		legalLinks = ['privacyPolicy', 'cookiePolicy'],
	}: {
		options: ConsentManagerOptions;
		legalLinks?: ('privacyPolicy' | 'cookiePolicy' | 'termsOfService')[];
	} = $props();
</script>

<ConsentProvider {options}>
	<ConsentBanner
		description="Copy."
		{legalLinks}
	/>
</ConsentProvider>
