<script setup lang="ts">
import { computed } from 'vue';
import type { ConsentLegalLinkKey } from '@c15t/config';
import legalStyles from '@c15t/styles/legal-links.module.css';
import { useConsentConfig, useConsentInit } from '#c15t/composables';

const props = defineProps<{
	context: 'banner' | 'dialog' | 'manager';
	link: ConsentLegalLinkKey;
}>();

const init = useConsentInit();
const config = useConsentConfig();

const entry = computed(() => config.value.legalLinks?.[props.link]);

const resolvedHref = computed(() => entry.value?.href ?? '#');
</script>

<template>
	<a
		v-bind="config.components?.link?.[context]"
		:href="resolvedHref"
		:target="entry?.target"
		:rel="entry?.rel"
		data-testid="consent-link"
		:class="legalStyles.legalLink"
	>
		<slot>
			{{ entry?.label ?? init?.translations?.translations?.legalLinks?.[link] }}
		</slot>
	</a>
</template>
