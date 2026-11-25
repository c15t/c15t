<!-- #region docs:shopify-sveltekit-layout title="src/routes/+layout.svelte" -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		initializeShopifyScripts,
		renderShopifyScriptTags,
	} from '@shopify/hydrogen';
	import {
		ConsentBanner,
		ConsentDialog,
		ConsentDialogLink,
		ConsentRoot,
	} from 'c15t/svelte';
	import { onMount } from 'svelte';

	import { i18n, shop } from '#lib/shop.js';
	import ShopifyConsentSync from '#lib/shopify-consent-sync.svelte';
	import { shopifyPrivacy } from '#lib/shopify-privacy.js';

	let { children, data } = $props();

	const consent = {
		mode: 'custom-banner',
		setup: shopifyPrivacy.setup,
	} as const;

	// Hydrogen has no Svelte binding: render its tags on the server, then
	// start them in the browser with the same consent settings.
	const shopifyTags = renderShopifyScriptTags({ consent, i18n, shop }).join('');

	onMount(() => {
		void initializeShopifyScripts({ consent, navigate: (url) => goto(url) });
	});
</script>

<svelte:head>
	{@html shopifyTags}
</svelte:head>

<!-- Shopify's scripts load outside c15t, so declare the categories the
     bridge maps. Without them the dialog offers only Necessary. -->
<ConsentRoot
	consentCategories={['measurement', 'marketing', 'functionality']}
	state={data.consent}
>
	<ShopifyConsentSync />
	{@render children()}
	<footer>
		<ConsentDialogLink>Privacy settings</ConsentDialogLink>
	</footer>
	<ConsentBanner />
	<ConsentDialog />
</ConsentRoot>
<!-- #endregion docs:shopify-sveltekit-layout -->
