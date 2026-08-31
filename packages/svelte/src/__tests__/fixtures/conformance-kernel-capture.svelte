<script lang="ts">
	import type { ConsentKernel } from '@c15t/core/v3';

	import { getConsentKernel } from '../../lib/context.svelte';

	let {
		onKernel,
	}: {
		onKernel?: (kernel: ConsentKernel) => void;
	} = $props();

	onKernel?.(getConsentKernel());
</script>
