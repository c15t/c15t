<script lang="ts" setup>
import { watch } from 'vue';

import {
	useConsentActiveUI,
	useConsentInit,
	useConsentKernelContext,
} from '../composables';
import { useConsentConfig } from '../composables/config';
import { useMounted } from '../composables/use-mounted';
import { applyRootOverrides } from '../root-overrides';
import {
	LazyConsentDialogTrigger,
	LazyConsentManager,
	LazyIabConsentBanner,
	LazyIabConsentDialog,
	useIdleDialogPrefetch,
} from './lazy-surfaces';
import ConsentBanner from './prompt.vue';

const props = defineProps<{
	region?: string;
	country?: string;
	language?: string;
}>();

const activeUI = useConsentActiveUI();
const init = useConsentInit();
const config = useConsentConfig();
const context = useConsentKernelContext();
// An `iab` policy without `iab` has no surface to show; the context reports
// the error instead.
const { iabUnavailable } = context;
// The trigger shows only after mount, so its chunk loads after mount too.
const mounted = useMounted();

// While the banner is shown, prefetch the dialog chunk once the page has
// loaded and gone quiet, so the first open rarely waits for it.
useIdleDialogPrefetch(
	() => activeUI.value === 'banner',
	() => Boolean(init.value?.gvl || init.value?.gvlReference)
);

watch(
	() => ({
		country: props.country,
		language: props.language,
		region: props.region,
	}),
	(next, previous) => applyRootOverrides(context, next, previous),
	{ immediate: true }
);
</script>

<template>
	<template v-if="!iabUnavailable">
		<LazyIabConsentBanner
			v-if="(init?.gvl || init?.gvlReference) && activeUI === 'banner'"
		/>
		<LazyIabConsentDialog
			v-else-if="(init?.gvl || init?.gvlReference) && activeUI === 'manager'"
		/>
		<ConsentBanner
			v-else-if="!(init?.gvl || init?.gvlReference) && activeUI === 'banner'"
		/>
		<LazyConsentManager
			v-else-if="!(init?.gvl || init?.gvlReference) && activeUI === 'manager'"
		/>
		<LazyConsentDialogTrigger v-if="config.showTrigger && mounted" />
	</template>
</template>
