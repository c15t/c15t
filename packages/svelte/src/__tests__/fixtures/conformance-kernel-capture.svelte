<script lang="ts">
	import type { ConsentKernel } from '@c15t/core';

	import {
		getConsentKernel,
		getConsentManager,
	} from '../../lib/context.svelte';
	import type { ConsentCompatState } from '../../lib/context.svelte';

	let {
		onKernel,
		onManager,
	}: {
		onKernel?: (kernel: ConsentKernel) => void;
		onManager?: (manager: ConsentCompatState) => void;
	} = $props();

	onKernel?.(getConsentKernel());
	onManager?.(getConsentManager());
</script>
