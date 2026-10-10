<!-- #region docs:nuxt-scripts-events title="app/components/PurchaseButton.vue" -->
<script setup lang="ts">
import { metaPixelEvent } from '@c15t/integrations/meta-pixel';

const props = defineProps<{ value: number }>();
const consent = useConsent();

const onPurchase = () => {
	// Was proxy.gtag('event', 'purchase', ...) from useScriptGoogleAnalytics()
	window.gtag?.('event', 'purchase', { currency: 'USD', value: props.value });

	// Was proxy.fbq('track', 'Purchase', ...) from useScriptMetaPixel().
	// fbq stays defined after a revocation until the page reloads, so check
	// the permission, not the global.
	if (consent.value.marketing) {
		metaPixelEvent('Purchase', { currency: 'USD', value: props.value });
	}
};
</script>

<template>
	<button
		type="button"
		@click="onPurchase"
	>
		Buy now
	</button>
</template>
<!-- #endregion docs:nuxt-scripts-events -->
