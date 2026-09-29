<!--
	Not mounted in this example. The docs publish it, and `check-types`
	verifies its imports and props against the package.
-->
<!-- #region docs:iab-surfaces title="src/IabSurfaces.vue" -->
<script setup lang="ts">
import IABConsentBanner from 'c15t/vue/runtime/components/iab-consent-banner.vue';
import IABConsentDialog from 'c15t/vue/runtime/components/iab-consent-dialog.vue';
</script>

<template>
	<!-- Only for sites where every policy uses IAB TCF. ConsentRoot
	     switches between the IAB and standard surfaces for you. -->
	<IABConsentBanner />
	<IABConsentDialog initial-tab="purposes" />
</template>
<!-- #endregion docs:iab-surfaces -->
