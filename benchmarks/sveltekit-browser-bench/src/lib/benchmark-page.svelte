<script lang="ts">
	/**
	 * Page body shared by the measured arms. `#open-preferences` is the
	 * repeat-visitor interaction target — the only consent surface a
	 * returning visitor can reach.
	 */
	import type { SvelteBenchScenario } from '$lib/benchmark-probe.svelte';
	import { getConsentKernel } from '@c15t/svelte';

	let { scenario }: { scenario: SvelteBenchScenario } = $props();

	const kernel = getConsentKernel();

	const openPreferences = function openPreferences() {
		kernel.set.activeUI('dialog');
	};
</script>

<main style="padding: 2rem; font-family: system-ui, sans-serif">
	<h1>SvelteKit Benchmark: {scenario}</h1>
	<button
		id="open-preferences"
		onclick={openPreferences}
		type="button"
	>
		Open Preferences
	</button>
</main>
