<script lang="ts">
	import ScriptCount from '$lib/bench/script-count.svelte';

	let { data }: { data: { count: number } } = $props();
</script>

<ScriptCount count={data.count} />
