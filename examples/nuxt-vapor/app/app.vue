<script setup vapor lang="ts">
// Pages that bring their own consent UI set `headlessConsent` in
// `definePageMeta`, so the stock banner and dialog stay out of them.
const route = useRoute();
const activeUI = useConsentActiveUI();
</script>

<template>
	<ConsentPrompt v-if="route.meta.headlessConsent" />
	<ConsentRoot v-else />
	<NuxtPage />
	<footer class="consent-example">
		<button
			v-if="route.meta.headlessConsent"
			type="button"
			@click="activeUI = 'manager'"
		>
			Privacy settings
		</button>
		<ConsentPreferencesLink v-else>Privacy settings</ConsentPreferencesLink>
	</footer>
</template>
