<script setup lang="ts">
import { defineAsyncComponent } from 'vue';

// Development builds only: the dynamic import keeps DevTools out of
// production bundles.
const DevTools = import.meta.env.DEV
	? defineAsyncComponent(() => import('c15t/vue/devtools'))
	: null;
</script>

<template>
	<DevTools
		v-if="DevTools"
		position="bottom-right"
	/>
</template>
