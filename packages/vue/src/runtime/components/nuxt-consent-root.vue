<script
	lang="ts"
	setup
>
import {
	useConsentActiveUI,
	useConsentInit,
	useConsentConfig,
	useConsentKernel,
} from '../composables';
import { useHead } from '#imports';
import { computed, watch } from 'vue';
import ConsentBanner from './consent-banner.vue';
import ConsentManager from './consent-manager.vue';
import IabConsentBanner from './iab-consent-banner.vue';
import IabConsentDialog from './iab-consent-dialog.vue';

const props = defineProps<{
	region?: string;
	country?: string;
}>();

const config = useConsentConfig();
const init = useConsentInit();
const activeUI = useConsentActiveUI();
const kernel = useConsentKernel();

watch(
	() => [props.country, props.region] as const,
	([country, region]) => {
		if (!(country || region)) return;
		kernel.set.overrides({ country, region });
		void kernel.commands.init();
	},
	{ immediate: true }
);

useHead(
	computed(() => {
		const style = Object.entries(config.value.tokens ?? {})
			.map(([key, value]) => `--${key}: ${String(value)};`)
			.join(' ');
		return style
			? {
					style: [
						{
							innerHTML: `:root { ${style} }`,
							id: 'c15t-css-vars',
						},
					],
				}
			: {};
	})
);
</script>

<template>
	<IabConsentBanner v-if="init?.gvl" />
	<ConsentBanner v-else />
	<IabConsentDialog v-if="init?.gvl" />
	<ConsentManager v-else />
</template>
