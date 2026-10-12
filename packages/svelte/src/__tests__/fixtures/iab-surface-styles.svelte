<script lang="ts">
	import type { ConsentKernel } from '@c15t/core';

	import ConsentProvider from '../../lib/components/consent-provider.svelte';
	import IABConsentDialog from '../../lib/components/iab-panel.svelte';
	import IABConsentBanner from '../../lib/components/iab-prompt.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';
	import ConformanceKernelCapture from './conformance-kernel-capture.svelte';

	let {
		options,
		banner = true,
		dialog = true,
		open,
		noStyle,
		onKernel,
	}: {
		options: ConsentManagerOptions;
		banner?: boolean;
		dialog?: boolean;
		open?: boolean;
		noStyle?: boolean;
		onKernel?: (kernel: ConsentKernel) => void;
	} = $props();
</script>

<ConsentProvider {options}>
	<ConformanceKernelCapture {onKernel} />
	{#if banner}
		<IABConsentBanner {noStyle} />
	{/if}
	{#if dialog}
		<IABConsentDialog
			{open}
			{noStyle}
		/>
	{/if}
</ConsentProvider>

<main data-testid="iab-style-following-content">
	<p>The page after the consent components.</p>
	<button>Continue</button>
</main>
