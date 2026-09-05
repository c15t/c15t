<script setup lang="ts">
import type {
	ConsentDialogTriggerPosition,
	ConsentDialogTriggerSize,
} from '@c15t/schema/config';
import triggerStyles from '@c15t/ui/styles/components/consent-dialog-trigger';
import { computed, ref, watch } from 'vue';

import {
	useConsentActiveUI,
	useConsentConfig,
	useConsentInit,
} from '#c15t/composables';

import { usePolicyRule } from '../composables/kernel';
import { useDraggable } from '../composables/use-draggable';
import { useLocalStorageRef } from '../composables/use-local-storage-ref';
import { useMounted } from '../composables/use-mounted';
import { useWindowSize } from '../composables/use-window-size';
import ConsentBrandingIcon from './consent-branding-icon.vue';

const activeUI = useConsentActiveUI();
const config = useConsentConfig();
const policy = usePolicyRule();
const init = useConsentInit();

const STORAGE_KEY = 'c15t:dialog-trigger-position';
const STORAGE_OFFSET = 20;

const mounted = useMounted();
const { width, height } = useWindowSize();
const triggerRef = ref<HTMLElement | null>(null);
const persistedPosition = useLocalStorageRef<{ x: number; y: number } | null>(
	STORAGE_KEY,
	null
);

const resolveSizePixels = function resolveSizePixels(
	size: ConsentDialogTriggerSize
): number {
	if (size === 'sm') {
		return 32;
	}
	if (size === 'lg') {
		return 48;
	}
	return 40;
};

const resolveInitialPosition = function resolveInitialPosition(
	position: ConsentDialogTriggerPosition,
	size: ConsentDialogTriggerSize
) {
	const sizePixels = resolveSizePixels(size);
	const maxX = Math.max(
		width.value - sizePixels - STORAGE_OFFSET,
		STORAGE_OFFSET
	);
	const maxY = Math.max(
		height.value - sizePixels - STORAGE_OFFSET,
		STORAGE_OFFSET
	);
	if (position === 'top-left') {
		return { x: STORAGE_OFFSET, y: STORAGE_OFFSET };
	}
	if (position === 'top-right') {
		return { x: maxX, y: STORAGE_OFFSET };
	}
	if (position === 'bottom-left') {
		return { x: STORAGE_OFFSET, y: maxY };
	}
	return { x: maxX, y: maxY };
};

const initialValue = computed(
	() =>
		persistedPosition.value ??
		resolveInitialPosition(
			config.value.triggerDefaultPosition ?? 'bottom-right',
			config.value.triggerSize ?? 'md'
		)
);

const { position, isDragging } = useDraggable(triggerRef, {
	initialValue: initialValue.value,
	onEnd: (nextPosition) => {
		if (!config.value.triggerPersistPosition) {
			return;
		}

		persistedPosition.value = { x: nextPosition.x, y: nextPosition.y };
	},
	preventDefault: true,
	stopPropagation: true,
});

watch(
	[mounted, width, height],
	() => {
		if (!mounted.value || isDragging.value) {
			return;
		}
		if (persistedPosition.value) {
			return;
		}

		const next = resolveInitialPosition(
			config.value.triggerDefaultPosition ?? 'bottom-right',
			config.value.triggerSize ?? 'md'
		);
		position.value = next;
	},
	{ immediate: true }
);

const isVisible = computed(() => {
	if (!mounted.value) {
		return false;
	}
	// Keep persistent preferences accessible while a notice is open.
	if (activeUI.value === 'manager') {
		return false;
	}
	if (config.value.triggerShowWhen === 'never') {
		return false;
	}
	return true;
});

const triggerStyle = computed(() => ({
	left: `${position.value.x}px`,
	position: 'fixed' as const,
	top: `${position.value.y}px`,
	zIndex: 9999,
}));

const openDialog = function openDialog() {
	activeUI.value = 'manager';
};
</script>

<template>
	<Teleport
		v-if="mounted"
		to="body"
	>
		<button
			v-if="isVisible"
			ref="triggerRef"
			v-bind="config.components?.trigger?.root"
			type="button"
			data-testid="consent-dialog-trigger"
			data-c15t-trigger="true"
			:data-c15t-rights="policy.rights.join(' ')"
			:class="triggerStyles.trigger"
			:data-size="config.triggerSize"
			:data-dragging="isDragging ? true : undefined"
			:style="triggerStyle"
			:aria-label="config.triggerAriaLabel"
			@click="openDialog"
		>
			<span
				v-bind="config.components?.trigger?.icon"
				:class="triggerStyles.icon"
				aria-hidden="true"
			>
				<svg
					v-if="config.triggerIcon === 'fingerprint'"
					aria-hidden="true"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M12 12a4 4 0 0 0-4 4" />
					<path d="M12 8a8 8 0 0 0-8 8" />
					<path d="M12 4a12 12 0 0 0-12 12" />
					<path d="M12 12a4 4 0 0 1 4 4" />
					<path d="M12 8a8 8 0 0 1 8 8" />
					<path d="M12 4a12 12 0 0 1 12 12" />
				</svg>
				<svg
					v-else-if="config.triggerIcon === 'settings'"
					aria-hidden="true"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<circle
						cx="12"
						cy="12"
						r="3"
					/>
					<path
						d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65
						1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65
						0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65
						1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0
						0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65
						1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65
						0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65
						1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65
						0 0 0-1.51 1z"
					/>
				</svg>
				<ConsentBrandingIcon
					v-else
					:branding="init?.branding"
				/>
			</span>
			<span
				v-if="config.components?.trigger?.text"
				v-bind="config.components?.trigger?.text"
				:class="triggerStyles.text"
			>
				{{ config.triggerAriaLabel }}
			</span>
		</button>
	</Teleport>
</template>
