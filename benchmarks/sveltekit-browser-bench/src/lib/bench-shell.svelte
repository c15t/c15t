<script lang="ts">
	/**
	 * Consent surfaces every measured arm mounts: the probe, the banner and
	 * the dialog. Kept in one place so the arms differ only in how their
	 * layout configures the provider.
	 */
	import BenchmarkProbe from '$lib/benchmark-probe.svelte';
	import type { SvelteBenchScenario } from '$lib/benchmark-probe.svelte';
	import { ConsentBanner, ConsentDialog } from '@c15t/svelte';
	import type { Snippet } from 'svelte';

	let {
		scenario,
		children,
	}: { scenario: SvelteBenchScenario; children: Snippet } = $props();
</script>

<BenchmarkProbe {scenario} />
<ConsentBanner />
<ConsentDialog />
{@render children()}
