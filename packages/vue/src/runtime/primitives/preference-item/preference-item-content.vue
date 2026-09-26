<script setup lang="ts">
import {
	getPreferenceItemState,
	PREFERENCE_ITEM_INTERNAL_SLOTS,
	PREFERENCE_ITEM_SLOTS,
} from '@c15t/ui/primitives';
import { computed, ref, watch } from 'vue';

import { usePreferenceItemContext } from './context';
import { preferenceItemVariants } from './variants';

const props = withDefaults(
	defineProps<{
		class?: string;
		/**
		 * Render the slot while the item has never been opened. By default
		 * the slot mounts on first open and then stays mounted; collapsed
		 * content is `inert` and `aria-hidden` either way.
		 */
		forceMount?: boolean;
		innerClass?: string;
		/**
		 * Attributes for the inner element, which is where a surface's
		 * content slot lands — the outer two are the collapsing grid.
		 */
		innerAttrs?: object;
		/**
		 * Drop the built-in classes. Falls back to the root's `noStyle`,
		 * like the React primitive and the sibling trigger, so a surface
		 * that sets `noStyle` on its root only to own the item class passes
		 * an explicit `false` here to keep the collapse rules.
		 */
		noStyle?: boolean;
	}>(),
	{
		class: undefined,
		forceMount: false,
		innerAttrs: undefined,
		innerClass: undefined,
		noStyle: undefined,
	}
);

const context = usePreferenceItemContext();
const variants = preferenceItemVariants();

const noStyle = computed(() => props.noStyle ?? context.noStyle.value);
const contentClass = computed(() =>
	noStyle.value ? props.class : variants.content({ class: props.class })
);
const viewportClass = computed(() =>
	noStyle.value ? undefined : variants.contentViewport()
);
const innerClass = computed(() =>
	noStyle.value
		? props.innerClass
		: variants.contentInner({ class: props.innerClass })
);
const dataState = computed(() => getPreferenceItemState(context.open.value));
// A collapsed body can hold a whole vendor list: mount it on first open.
const hasOpened = ref(context.open.value);
watch(context.open, (open) => {
	if (open) {
		hasOpened.value = true;
	}
});
const renderSlot = computed(
	() => props.forceMount || context.open.value || hasOpened.value
);
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
				<slot v-if="renderSlot" />
			</div>
		</div>
	</div>
</template>
