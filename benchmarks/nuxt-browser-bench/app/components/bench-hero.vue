<script setup lang="ts">
/**
 * A 159 KB hero photo that starts loading after the window `load` event,
 * the way a single-page app's largest image often does once its route data
 * arrives. The dialog-open bench uses it so the dialog preload has a real
 * image to wait for.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';

import heroUrl from '../../../shared/assets/hero.jpg';

const show = ref(false);
const reveal = () => {
	show.value = true;
};

onMounted(() => {
	if (document.readyState === 'complete') {
		reveal();
		return;
	}
	window.addEventListener('load', reveal, { once: true });
});

onBeforeUnmount(() => {
	window.removeEventListener('load', reveal);
});
</script>

<template>
	<img
		v-if="show"
		alt=""
		data-testid="bench-hero"
		height="800"
		:src="heroUrl"
		style="display: block; width: 100%; height: auto; border-radius: 24px"
		width="1200"
	/>
</template>
