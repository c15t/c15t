<!--
	Description body shared by the banner and the dialog. It takes its class
	from the caller instead of importing the style maps: importing the
	dialog's map here put the dialog stylesheet in the banner's first load,
	and in Nuxt in every page's render-blocking CSS. `description.vue` is the
	public component and picks the class by context.
-->
<script setup lang="ts">
import type { CompleteTranslations } from '@c15t/translations';
import { computed } from 'vue';

import { useConsentConfig, useConsentInit } from '#c15t/composables';

import { useConsentSnapshot } from '../composables/kernel';
import ConsentLegalLinks from './legal-links.vue';

const props = defineProps<{
	context: 'banner' | 'dialog' | 'manager';
	/** The description class from the surface's own style map. */
	descriptionClass?: string;
}>();

const init = useConsentInit();
const config = useConsentConfig();
const snapshot = useConsentSnapshot();

/**
 * A notice prompt explains and points at the opt-out instead of asking;
 * it reads the notice copy and falls back to the choice copy.
 */
const bannerDescription = computed(() => {
	const cookieBanner = (
		init.value?.translations?.translations as
			| Partial<CompleteTranslations>
			| undefined
	)?.cookieBanner;
	if (snapshot.value.policyRule.prompt === 'notice') {
		return cookieBanner?.noticeDescription ?? cookieBanner?.description;
	}
	return cookieBanner?.description;
});

const legalLinks = computed(() => {
	if (props.context === 'banner') {
		return config.value.bannerLegalLinks;
	}
	return config.value.dialogLegalLinks;
});

const linkContext = computed(() =>
	props.context === 'manager' ? 'manager' : props.context
);

// Only the dialog's description is referenced, by the dialog's
// `aria-describedby`.
const descriptionId = computed(() =>
	props.context === 'banner' ? undefined : 'consent-dialog-description'
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
		:id="descriptionId"
		:data-testid="testId"
		:class="descriptionClass"
		:data-context="context"
	>
		<slot>
			<template v-if="context === 'banner'">
				{{ bannerDescription }}
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
