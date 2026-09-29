<!-- #region docs:devtools -->
<script setup lang="ts">
import { defineAsyncComponent } from 'vue';

// Development builds only: the dynamic import keeps DevTools out of
// production bundles.
const ConsentDevTools = import.meta.dev
	? defineAsyncComponent(() => import('c15t/vue/devtools'))
	: null;
</script>

<template>
	<ConsentDevTools
		v-if="ConsentDevTools"
		position="bottom-right"
	/>
</template>
<!-- #endregion docs:devtools -->
