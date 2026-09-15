<script setup lang="ts">
import { computed, onUnmounted } from 'vue';

const snapshot = useConsentSnapshot();
const activeUI = useConsentActiveUI();
const allowed = computed(() => snapshot.value.effectivePermissions.measurement);
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
		<iframe
			v-if="allowed"
			src="https://www.youtube-nocookie.com/embed/czTksCF6X8Y"
			title="YouTube video"
			allowfullscreen
		/>
		<div v-else>
			<p>
				Allow measurement to load this YouTube video. No video request is sent
				before permission.
			</p>
			<button
				type="button"
				@click="activeUI = 'manager'"
			>
				Open privacy settings
			</button>
		</div>
		<footer>
			<button
				type="button"
				@click="activeUI = 'manager'"
			>
				Privacy settings
			</button>
		</footer>
	</main>
</template>
