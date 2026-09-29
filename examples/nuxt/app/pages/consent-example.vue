<script setup lang="ts">
import { onUnmounted } from 'vue';

// The same page under route rules that share its HTML between visitors
// (see `routeRules` in nuxt.config.ts).
definePageMeta({
	alias: ['/prerendered/consent-example', '/cached/consent-example'],
});

// Demo only: the branded theme overrides c15t tokens from
// `consent-example.css` so the test suite can switch designs in place.
const setTheme = (theme: string) => {
	document.documentElement.dataset.consentExampleTheme = theme;
};
onUnmounted(() => {
	delete document.documentElement.dataset.consentExampleTheme;
});
</script>

<template>
	<main class="consent-example">
		<h1>Consent example</h1>
		<p>
			PostHog waits for measurement permission. X Pixel waits for marketing
			permission.
		</p>
		<button
			type="button"
			@click="setTheme('default')"
		>
			Default theme
		</button>
		<button
			type="button"
			@click="setTheme('branded')"
		>
			Branded theme
		</button>
		<h2>Watch the video</h2>
		<VideoEmbed />
		<ConsentDebugTools />
	</main>
</template>
