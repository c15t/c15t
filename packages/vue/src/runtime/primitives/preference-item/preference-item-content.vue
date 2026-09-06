<script setup lang="ts">
import {
	getPreferenceItemState,
	PREFERENCE_ITEM_INTERNAL_SLOTS,
	PREFERENCE_ITEM_SLOTS,
} from '@c15t/ui/primitives';
import { preferenceItemVariants } from '@c15t/ui/styles/primitives';
import { computed } from 'vue';

import { usePreferenceItemContext } from './context';

const props = withDefaults(
	defineProps<{
		class?: string;
		innerClass?: string;
		/**
		 * Attributes for the inner element, which is where a surface's
		 * content slot lands — the outer two are the collapsing grid.
		 */
		innerAttrs?: object;
	}>(),
	{ class: undefined, innerAttrs: undefined, innerClass: undefined }
);

const context = usePreferenceItemContext();
const variants = preferenceItemVariants();

const contentClass = computed(() => variants.content({ class: props.class }));
const viewportClass = computed(() => variants.contentViewport());
const innerClass = computed(() =>
	variants.contentInner({ class: props.innerClass })
);
const dataState = computed(() => getPreferenceItemState(context.open.value));
</script>

<template>
	<div
		:id="context.contentId"
		:aria-hidden="!context.open.value"
		:aria-labelledby="context.triggerId"
		:class="contentClass"
		:data-slot="PREFERENCE_ITEM_SLOTS.content"
		:data-state="dataState"
		:inert="!context.open.value"
	>
		<div
			:class="viewportClass"
			:data-slot="PREFERENCE_ITEM_INTERNAL_SLOTS.contentViewport"
		>
			<div
				v-bind="props.innerAttrs"
				:class="innerClass"
				:data-slot="PREFERENCE_ITEM_INTERNAL_SLOTS.contentInner"
			>
				<slot />
			</div>
		</div>
	</div>
</template>
