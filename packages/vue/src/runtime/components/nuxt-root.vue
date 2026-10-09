<script lang="ts" setup>
import { ref, watch } from 'vue';

import {
	useConsentActiveUI,
	useConsentInit,
	useConsentConfig,
	useConsentKernelContext,
} from '../composables';
import { useMounted } from '../composables/use-mounted';
import { applyRootOverrides } from '../root-overrides';
import {
	LazyConsentBanner as ConsentBanner,
	LazyConsentDialogTrigger,
	LazyConsentManager,
	LazyIabConsentBanner,
	LazyIabConsentDialog,
	useIdleDialogPrefetch,
} from './lazy-surfaces';

const props = defineProps<{
	region?: string;
	country?: string;
	language?: string;
}>();

const config = useConsentConfig();
const init = useConsentInit();
const activeUI = useConsentActiveUI();
const context = useConsentKernelContext();
// An `iab` policy without `iab` has no surface to show; the context reports
// the error instead.
const { iabUnavailable } = context;
// The trigger shows only after mount, so its chunk loads after mount too.
const mounted = useMounted();

watch(
	() => ({
		country: props.country,
		language: props.language,
		region: props.region,
	}),
	(next, previous) => applyRootOverrides(context, next, previous),
	{ immediate: true }
);

// Mount dialog surfaces once first needed, then keep them mounted (close
// animations, repeat opens). While the banner is shown, the chunk is
// prefetched once the page has loaded and gone quiet, so the first open
// rarely pays network+parse.
const managerNeeded = ref(false);
const iabDialogNeeded = ref(false);
watch(
	activeUI,
	(ui) => {
		if (ui === 'manager') {
			if (init.value?.gvl || init.value?.gvlReference) {
				iabDialogNeeded.value = true;
			} else {
				managerNeeded.value = true;
			}
		}
	},
	{ immediate: true }
);
useIdleDialogPrefetch(
	() => activeUI.value === 'banner',
	() => Boolean(init.value?.gvl || init.value?.gvlReference)
);
</script>

<template>
	<template v-if="!iabUnavailable">
		<LazyIabConsentBanner v-if="init?.gvl || init?.gvlReference" />
		<ConsentBanner v-else />
		<LazyIabConsentDialog
			v-if="(init?.gvl || init?.gvlReference) && iabDialogNeeded"
		/>
		<LazyConsentManager
			v-else-if="!(init?.gvl || init?.gvlReference) && managerNeeded"
		/>
		<LazyConsentDialogTrigger v-if="config.showTrigger && mounted" />
	</template>
</template>
