<script lang="ts">
	import type { ConsentKernel } from '@c15t/core';
	import { untrack } from 'svelte';

	import { getConsentKernel } from '../../lib/context.svelte';

	let {
		onKernel,
	}: {
		onKernel?: (kernel: ConsentKernel) => void;
	} = $props();

	const kernel = getConsentKernel();
	untrack(() => onKernel?.(kernel));
</script>
