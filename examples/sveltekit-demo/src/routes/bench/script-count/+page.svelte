<script lang="ts">
	import ScriptCountV2 from '$lib/bench/script-count-v2.svelte';
	import ScriptCountV3 from '$lib/bench/script-count-v3.svelte';

	let { data }: { data: { version: 'v2' | 'v3'; count: number } } = $props();
</script>

{#if data.version === 'v3'}
	<ScriptCountV3 count={data.count} />
{:else}
	<ScriptCountV2 count={data.count} />
{/if}

