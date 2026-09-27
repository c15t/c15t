<script setup lang="ts">
import bannerStyles from '@c15t/ui/styles/components/consent-banner';

import '@c15t/ui/styles/components/consent-banner.css';
import dialogStyles from '@c15t/ui/styles/components/consent-dialog';

import '@c15t/ui/styles/components/consent-dialog.css';
import { computed } from 'vue';

import DescriptionContent from './description-content.vue';

const props = defineProps<{
	context: 'banner' | 'dialog' | 'manager';
}>();

/**
 * The banner and the dialog each style their description in their own
 * stylesheet, so the class has to come from the right one — the banner's
 * tighter letter-spacing does not belong on the dialog.
 */
const descriptionClass = computed(() =>
	props.context === 'banner'
		? bannerStyles.description
		: dialogStyles.description
);
</script>

<template>
	<DescriptionContent
		:context="context"
		:description-class="descriptionClass"
	>
		<template
			v-if="$slots.default"
			#default
		>
			<slot />
		</template>
	</DescriptionContent>
</template>
