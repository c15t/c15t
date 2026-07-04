<script lang="ts">
	import { getConsentManager } from '@c15t/svelte';
	import { onMount } from 'svelte';

	const consent = getConsentManager();

	onMount(() => {
		consent.setActiveUI('banner', { force: true });
	});
</script>
