<script setup lang="ts">
import type { ConsentLegalLinkKey } from '@c15t/schema/config';

import '@c15t/ui/styles/components/legal-links.css';
import { computed } from 'vue';

import { useConsentConfig, useConsentInit } from '#c15t/composables';

import ConsentLink from './link.vue';

const ALL_LEGAL_LINKS: ConsentLegalLinkKey[] = [
	'privacyPolicy',
	'cookiePolicy',
	'termsOfService',
];

const props = defineProps<{
	context: 'banner' | 'dialog' | 'manager';
	links: ConsentLegalLinkKey[];
}>();

const resolvedLinks = computed(() =>
	props.links.filter((link) => ALL_LEGAL_LINKS.includes(link))
);

const init = useConsentInit();
const config = useConsentConfig();

const label = (link: ConsentLegalLinkKey): string | undefined =>
	config.value.legalLinks?.[link]?.label ??
	init.value?.translations?.translations?.legalLinks?.[link];

const isLast = (index: number): boolean =>
	index === resolvedLinks.value.length - 1;
</script>

<!--
	Inline after the description, as the React banner's `InlineLegalLinks`:
	a space first, and a comma inside every link but the last, followed by a
	space outside it. The tags sit tight against the text on purpose: a line
	break beside an interpolation would render as an extra space.
-->
<template>
	<span
		v-if="resolvedLinks.length > 0"
		v-bind="config.components?.['legal-links']?.root"
		data-testid="consent-legal-links"
		>{{ ' '
		}}<span
			v-for="(link, index) in resolvedLinks"
			:key="link"
			><ConsentLink
				:context="context"
				:link="link"
				>{{ label(link) }}{{ isLast(index) ? '' : ',' }}</ConsentLink
			>{{ isLast(index) ? '' : ' ' }}</span
		></span
	>
</template>
