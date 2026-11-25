<!-- #region docs:shopify-nuxt-app title="app/app.vue" -->
<script setup lang="ts">
import { createShopifyCustomerPrivacy } from '@c15t/integrations/shopify';
import { ShopifyScripts } from '@shopify/hydrogen/vue';

import { i18n, shop } from '~/lib/shop';

// One bridge per page. Its `setup` holds Hydrogen's analytics until Shopify
// has the visitor's choice.
const shopifyPrivacy = createShopifyCustomerPrivacy();
const consent = {
	mode: 'custom-banner',
	setup: shopifyPrivacy.setup,
} as const;

const router = useRouter();
const kernel = useConsentKernel();

// Sends the current choice and each change to Shopify. app.vue lives as long
// as the page, so there is nothing to stop.
onMounted(() => {
	shopifyPrivacy.connect(kernel);
});
</script>

<template>
	<ShopifyScripts
		:consent="consent"
		:i18n="i18n"
		:navigate="(url: string) => router.push(url)"
		:shop="shop"
	/>
	<ConsentRoot />
	<NuxtPage />
	<footer>
		<ConsentDialogLink>Privacy settings</ConsentDialogLink>
	</footer>
</template>
<!-- #endregion docs:shopify-nuxt-app -->
