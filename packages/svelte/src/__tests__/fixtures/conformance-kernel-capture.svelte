<script lang="ts">
import { getConsentKernel } from '../../lib/context.svelte';
import type { ConsentKernel } from 'c15t/v3';

let {
	onKernel,
}: {
	onKernel?: (kernel: ConsentKernel) => void;
} = $props();

onKernel?.(getConsentKernel());
</script>
