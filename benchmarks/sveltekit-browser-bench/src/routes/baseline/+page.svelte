<script lang="ts">
	/**
	 * Zero-consent baseline: the same SvelteKit shell, server-rendered, with
	 * no c15t anywhere in the route's module graph. Gives the floor that
	 * `consentTax = bannerVisible − floor` subtracts.
	 */
	import { publishBaselineProbe } from '$lib/baseline-probe';
	import { onMount } from 'svelte';

	onMount(() => publishBaselineProbe('baseline'));
</script>

<main style="padding: 2rem; font-family: system-ui, sans-serif">
	<h1>Zero-consent baseline</h1>
	<p>Identical app shell, no consent library. Measures the page floor.</p>
	<button
		id="baseline-noop"
		type="button"
	>
		No-op interaction target
	</button>
</main>
