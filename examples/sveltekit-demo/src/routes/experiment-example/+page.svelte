<script lang="ts">
	import { page } from '$app/state';
	import ExamplePage from '$lib/consent-example/example-page.svelte';
	import ExperimentReadout from '$lib/experiment-readout.svelte';

	const experiment = page.url.searchParams.get('experiment') === '1';
</script>

<ExamplePage>
	{#if experiment}<ExperimentReadout />{/if}
</ExamplePage>
