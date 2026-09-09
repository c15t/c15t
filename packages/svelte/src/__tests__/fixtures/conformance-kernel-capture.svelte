<script lang="ts">
	import type { ConsentKernel } from '@c15t/core';
	import { untrack } from 'svelte';

	import {
		getConsentKernel,
		getConsentManager,
	} from '../../lib/context.svelte';
	import type { ConsentManagerState } from '../../lib/context.svelte';

	let {
		onKernel,
		onManager,
	}: {
		onKernel?: (kernel: ConsentKernel) => void;
		onManager?: (manager: ConsentManagerState) => void;
	} = $props();

	const kernel = getConsentKernel();
	const manager = getConsentManager();
	untrack(() => {
		onKernel?.(kernel);
		onManager?.(manager);
	});
</script>
