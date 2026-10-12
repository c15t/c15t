<!-- #region docs:consent-surfaces title="src/ConsentSurfaces.vue" -->
<script setup lang="ts">
import {
	ConsentBanner,
	ConsentDialogTrigger,
	ConsentManager,
} from 'c15t/vue/vue-plugin';
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
