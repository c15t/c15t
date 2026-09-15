<script lang="ts">
	import type { ConsentKernel } from '@c15t/core';
	import { untrack } from 'svelte';

	import IabConsentDialog from '../../lib/components/iab-panel.svelte';
	import IabConsentBanner from '../../lib/components/iab-prompt.svelte';
	import ConsentManagerProvider from '../../lib/components/manager-provider.svelte';
	import ConsentDialog from '../../lib/components/panel.svelte';
	import ConsentWidget from '../../lib/components/preferences.svelte';
	import ConsentBanner from '../../lib/components/prompt.svelte';
	import type { ConsentManagerState } from '../../lib/context.svelte';
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
		onManager,
	}: {
		component: MountableComponent;
		options: ConsentManagerOptions;
		onKernel?: (kernel: ConsentKernel) => void;
		onManager?: (manager: ConsentManagerState) => void;
	} = $props();
</script>

<ConsentManagerProvider {options}>
	<ConformanceKernelCapture
		{onKernel}
		{onManager}
	/>
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
		<IabConsentDialog open />
	{/if}
</ConsentManagerProvider>
