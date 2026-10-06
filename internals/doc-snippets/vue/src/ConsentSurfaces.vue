<!-- #region docs:consent-surfaces title="src/ConsentSurfaces.vue" -->
<script setup lang="ts">
import ConsentBanner from 'c15t/vue/runtime/components/consent-banner.vue';
import ConsentDialogTrigger from 'c15t/vue/runtime/components/consent-dialog-trigger.vue';
import ConsentManager from 'c15t/vue/runtime/components/consent-manager.vue';
</script>

<template>
	<!-- Render these in place of ConsentRoot, not next to it. -->
	<ConsentBanner
		variant="bar"
		position="bottom"
	/>
	<ConsentManager />
	<ConsentDialogTrigger />
</template>
<!-- #endregion docs:consent-surfaces -->
