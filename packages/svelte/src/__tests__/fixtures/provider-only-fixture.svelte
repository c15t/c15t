<script lang="ts">
	import type { ConsentKernel } from '@c15t/core';

	import ConsentManagerProvider from '../../lib/components/consent-manager-provider.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';
	import ConformanceKernelCapture from './conformance-kernel-capture.svelte';

	let {
		options,
		label = 'child',
		onKernel,
	}: {
		options: ConsentManagerOptions;
		label?: string;
		onKernel?: (kernel: ConsentKernel) => void;
	} = $props();
</script>

<ConsentManagerProvider {options}>
	<ConformanceKernelCapture {onKernel} />
	<div data-testid="render-{label}">{label}</div>
</ConsentManagerProvider>
