<script setup lang="ts">
import bannerStyles from '@c15t/ui/styles/components/consent-banner';
import dialogStyles from '@c15t/ui/styles/components/consent-dialog';
import { computed } from 'vue';

import { useConsentConfig, useConsentInit } from '#c15t/composables';

import ConsentLegalLinks from './consent-legal-links.vue';

const props = defineProps<{
	context: 'banner' | 'dialog' | 'manager';
}>();

const init = useConsentInit();
const config = useConsentConfig();

const legalLinks = computed(() => {
	if (props.context === 'banner') {
		return config.value.bannerLegalLinks;
	}
	return config.value.dialogLegalLinks;
});

const linkContext = computed(() =>
	props.context === 'manager' ? 'manager' : props.context
);

const testId = computed(() =>
	props.context === 'banner'
		? 'consent-banner-description'
		: 'consent-dialog-description'
);
</script>

<template>
	<div
		v-bind="config.components?.description?.[context]"
		:data-testid="testId"
		:id="context === 'dialog' ? 'consent-dialog-description' : undefined"
		:class="
			context === 'dialog' ? dialogStyles.description : bannerStyles.description
		"
		:data-context="context"
	>
		<slot>
			<template v-if="context === 'banner'">
				{{ init?.translations?.translations?.cookieBanner?.description }}
			</template>
			<template v-else>
				{{
					init?.translations?.translations?.consentManagerDialog?.description
				}}
			</template>
		</slot>
		<ConsentLegalLinks
			v-if="legalLinks !== undefined && legalLinks !== null"
			:context="linkContext"
			:links="legalLinks"
		/>
	</div>
</template>
