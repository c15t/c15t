<script setup lang="ts">
import type { ConsentLegalLinkKey } from '@c15t/schema/config';
import legalStyles from '@c15t/ui/styles/v3/legal-links';
import { computed } from 'vue';

import { useConsentConfig, useConsentInit } from '#c15t/composables';

const props = defineProps<{
	context: 'banner' | 'dialog' | 'manager';
	link: ConsentLegalLinkKey;
}>();

const init = useConsentInit();
const config = useConsentConfig();

const entry = computed(() => config.value.legalLinks?.[props.link]);

const resolvedHref = computed(() => entry.value?.href ?? '#');

const testId = computed(() => {
	const surface =
		props.context === 'banner' ? 'consent-banner' : 'consent-dialog';
	return `${surface}-legal-link-${props.link}`;
});
</script>

<template>
	<a
		v-bind="config.components?.link?.[context]"
		:href="resolvedHref"
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
