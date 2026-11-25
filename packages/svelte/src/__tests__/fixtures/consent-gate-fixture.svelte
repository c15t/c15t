<script lang="ts">
	import type { AllConsentNames, ConsentKernel } from '@c15t/core';

	import ConsentGate from '../../lib/components/consent-gate.svelte';
	import ConsentProvider from '../../lib/components/consent-provider.svelte';
	import type { ConsentManagerOptions } from '../../lib/types';
	import Capture from './conformance-kernel-capture.svelte';

	let {
		category,
		onKernel,
		options,
	}: {
		category: AllConsentNames;
		onKernel?: (kernel: ConsentKernel) => void;
		options: ConsentManagerOptions;
	} = $props();
</script>

<ConsentProvider {options}>
	<Capture {onKernel} />
	<ConsentGate {category} />
</ConsentProvider>
