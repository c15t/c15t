<!-- #region docs:shopify-sveltekit-sync title="src/lib/shopify-consent-sync.svelte" -->
<script lang="ts">
	import { getConsentKernel } from 'c15t/svelte';
	import { onMount } from 'svelte';

	import { shopifyPrivacy } from '#lib/shopify-privacy.js';

	// Render inside ConsentRoot. Sends the current choice and each change to
	// Shopify, and stops when the component unmounts.
	const kernel = getConsentKernel();
	onMount(() => shopifyPrivacy.connect(kernel));
</script>
<!-- #endregion docs:shopify-sveltekit-sync -->
