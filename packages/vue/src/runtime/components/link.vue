<script setup lang="ts">
import type { ConsentLegalLinkKey } from '@c15t/schema/config';
import legalStyles from '@c15t/ui/styles/components/legal-links';

import '@c15t/ui/styles/components/legal-links.css';
import { computed } from 'vue';

import { useConsentConfig, useConsentInit } from '#c15t/composables';

const props = defineProps<{
	context: 'banner' | 'dialog' | 'manager';
	/** Overrides the config's URL for this link. */
	href?: string;
	link: ConsentLegalLinkKey;
}>();

const init = useConsentInit();
const config = useConsentConfig();

const entry = computed(() => config.value.legalLinks?.[props.link]);
// A link with no `href`, passed or in the config, renders nothing, as in
// the other SDKs.
const href = computed(() => props.href ?? entry.value?.href);

const testId = computed(() => {
	const surface =
		props.context === 'banner' ? 'consent-banner' : 'consent-dialog';
	return `${surface}-legal-link-${props.link}`;
});
</script>

<template>
	<a
		v-if="href"
		v-bind="config.components?.link?.[context]"
		:href="href"
		:target="entry?.target"
		:rel="entry?.rel"
		:data-testid="testId"
		:class="legalStyles.legalLink"
	>
		<slot>
			{{ entry?.label ?? init?.translations?.translations?.legalLinks?.[link] }}
		</slot>
	</a>
</template>
