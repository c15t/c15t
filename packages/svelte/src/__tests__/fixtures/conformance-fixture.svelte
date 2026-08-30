<script lang="ts">
	import type { ConsentKernel } from '@c15t/core/v3';
	import ConsentBanner from '../../lib/components/consent-banner.svelte';
	import ConsentDialog from '../../lib/components/consent-dialog.svelte';
	import ConsentManagerProvider from '../../lib/components/consent-manager-provider.svelte';
	import ConsentWidget from '../../lib/components/consent-widget.svelte';
	import IabConsentBanner from '../../lib/components/iab-consent-banner.svelte';
	import IabConsentDialog from '../../lib/components/iab-consent-dialog.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';
	import ConformanceKernelCapture from './conformance-kernel-capture.svelte';

	type MountableComponent =
		| 'consent-banner'
		| 'consent-dialog'
		| 'consent-widget'
		| 'iab-consent-banner'
		| 'iab-consent-dialog';

	let {
		component,
		options,
		onKernel,
	}: {
		component: MountableComponent;
		options: ConsentManagerOptions;
		onKernel?: (kernel: ConsentKernel) => void;
	} = $props();
</script>

<ConsentManagerProvider {options}>
	<ConformanceKernelCapture {onKernel} />
	{#if component === 'consent-banner'}
		<ConsentBanner />
		<ConsentDialog />
	{:else if component === 'consent-dialog'}
		<ConsentDialog />
	{:else if component === 'consent-widget'}
		<ConsentWidget />
	{:else if component === 'iab-consent-banner'}
		<IabConsentBanner />
	{:else if component === 'iab-consent-dialog'}
		<IabConsentDialog />
	{/if}
</ConsentManagerProvider>
