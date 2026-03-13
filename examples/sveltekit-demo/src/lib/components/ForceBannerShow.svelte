<script lang="ts">
	import { getConsentContext } from '@c15t/svelte';
	import { onMount } from 'svelte';

	const consent = getConsentContext();

	onMount(() => {
		consent.state.setActiveUI('banner', { force: true });
	});
</script>
