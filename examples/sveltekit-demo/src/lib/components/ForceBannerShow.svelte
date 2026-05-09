<script lang="ts">
	import { getConsent } from '@c15t/svelte';
	import { onMount } from 'svelte';

	const consent = getConsent();

	onMount(() => {
		consent.setActiveUI('banner', { force: true });
	});
</script>
