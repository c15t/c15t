<script setup lang="ts">
import { evaluateConsent } from '@c15t/core';
import type { AllConsentNames } from '@c15t/core';
import frameStyles from '@c15t/ui/styles/components/frame';

import '@c15t/ui/styles/components/frame.css';
import { computed, watch } from 'vue';

import {
	useConsentActiveUI,
	useConsentKernel,
	useConsentSnapshot,
} from '../composables';
import { useSurfaceTranslations } from '../composables/use-surface-translations';
import ConsentButton from './button.vue';

const props = defineProps<{ category: AllConsentNames }>();
const snapshot = useConsentSnapshot();
const kernel = useConsentKernel();
const activeUI = useConsentActiveUI();
const translations = useSurfaceTranslations();
const allowed = computed(() =>
	evaluateConsent(
		{ category: props.category },
		snapshot.value,
		snapshot.value.evaluatedAt
	)
);

// The preferences the button opens list this category, as React's gate
// registers it.
watch(
	() => props.category,
	(category) => {
		kernel.set.registerConsentCategories([category]);
	},
	{ immediate: true }
);

const categoryTitle = computed(() => {
	const { bundle, english } = translations.value;
	const category = props.category as keyof typeof english.consentTypes;
	return (
		bundle?.consentTypes?.[category]?.title ??
		english.consentTypes[category]?.title ??
		props.category
	);
});

/**
 * Under a strict policy that leaves this category out, no choice can allow
 * the content, so the placeholder says so and offers no button.
 */
const policyBlocked = computed(() => {
	const { scope, scopeMode } = snapshot.value.policyRule;
	return (
		scopeMode === 'strict' &&
		props.category !== 'necessary' &&
		!(scope as readonly string[]).includes('*') &&
		!scope.includes(props.category)
	);
});

// The same `frame.*` copy the React and Svelte gates show.
const title = computed(() => {
	const { bundle, english } = translations.value;
	if (policyBlocked.value) {
		return bundle?.frame?.policyBlocked ?? english.frame.policyBlocked;
	}
	return (bundle?.frame?.title ?? english.frame.title).replace(
		'{category}',
		categoryTitle.value
	);
});
const actionLabel = computed(() => {
	const { bundle, english } = translations.value;
	return (bundle?.frame?.actionButton ?? english.frame.actionButton).replace(
		'{category}',
		categoryTitle.value
	);
});

const openPreferences = function openPreferences() {
	activeUI.value = 'manager';
};
</script>

<template>
	<slot v-if="allowed" />
	<slot
		v-else
		name="placeholder"
	>
		<div
			data-testid="frame-placeholder"
			:class="frameStyles.placeholder"
		>
			<div :class="frameStyles.title">{{ title }}</div>
			<ConsentButton
				v-if="!policyBlocked"
				variant="primary"
				mode="stroke"
				size="small"
				data-testid="frame-open-dialog"
				@click="openPreferences"
			>
				{{ actionLabel }}
			</ConsentButton>
		</div>
	</slot>
</template>
