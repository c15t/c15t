<script setup lang="ts">
import { evaluateConsent } from '@c15t/core';
import type { AllConsentNames } from '@c15t/core';
import { computed } from 'vue';

import { useConsentSnapshot } from '../composables';
import { useSurfaceTranslations } from '../composables/use-surface-translations';

const props = defineProps<{ category: AllConsentNames }>();
const snapshot = useConsentSnapshot();
const translations = useSurfaceTranslations();
const allowed = computed(() =>
	evaluateConsent(
		{ category: props.category },
		snapshot.value,
		snapshot.value.evaluatedAt
	)
);
// The same `frame.title` copy the React and Svelte gates show.
const placeholder = computed(() => {
	const { bundle, english } = translations.value;
	const category = props.category as keyof typeof english.consentTypes;
	const categoryTitle =
		bundle?.consentTypes?.[category]?.title ??
		english.consentTypes[category]?.title ??
		props.category;
	return (bundle?.frame?.title ?? english.frame.title).replace(
		'{category}',
		categoryTitle
	);
});
</script>

<template>
	<slot v-if="allowed" />
	<slot
		v-else
		name="placeholder"
		>{{ placeholder }}</slot
	>
</template>
