<script lang="ts">
	import { publishBaselineProbe } from '$lib/baseline-probe';
	import { onMount } from 'svelte';

	onMount(() => publishBaselineProbe('baseline-client'));
</script>

<main style="padding: 2rem; font-family: system-ui, sans-serif">
	<h1>Zero-consent baseline-client</h1>
	<p>Identical app shell, no consent library. Measures the page floor.</p>
	<button
		id="baseline-noop"
		type="button"
	>
		No-op interaction target
	</button>
</main>
