<script
	setup
	lang="ts"
>
import { computed } from 'vue';
import type { ConsentLegalLinkKey } from '@c15t/schema/config';
import legalStyles from '@c15t/ui/styles/v3/legal-links';
import ConsentLink from './consent-link.vue';

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
</script>

<template>
	<span
		v-if="resolvedLinks.length > 0"
		data-testid="consent-legal-links"
		:class="legalStyles.legalLinks"
	>
		<template
			v-for="(link, index) in resolvedLinks"
			:key="link"
		>
			<ConsentLink
				:context="context"
				:link="link"
			/>
			<span v-if="index < resolvedLinks.length - 1">, </span>
		</template>
	</span>
</template>
