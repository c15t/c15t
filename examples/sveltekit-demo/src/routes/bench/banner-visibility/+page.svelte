<script lang="ts">
	import BannerVisibilityV2 from '$lib/bench/banner-visibility-v2.svelte';
	import BannerVisibilityV3 from '$lib/bench/banner-visibility-v3.svelte';

	let { data }: { data: { version: 'v2' | 'v3' } } = $props();
</script>

{#if data.version === 'v3'}
	<BannerVisibilityV3 />
{:else}
	<BannerVisibilityV2 />
{/if}

