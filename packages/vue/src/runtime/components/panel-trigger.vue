<script setup lang="ts">
import type {
	ConsentDialogTriggerPosition,
	ConsentDialogTriggerSize,
} from '@c15t/schema/config';
import triggerStyles from '@c15t/ui/styles/components/consent-dialog-trigger';
import { followDevToolsDock } from '@c15t/ui/utils/devtools-launcher';
import { calculateNearestCorner } from '@c15t/ui/utils/trigger-utils';
import type { CornerPosition } from '@c15t/ui/utils/trigger-utils';

import '@c15t/ui/styles/components/consent-dialog-trigger.css';
import { computed, ref, watch } from 'vue';

import {
	useConsentActiveUI,
	useConsentConfig,
	useConsentInit,
} from '#c15t/composables';

import {
	useConsentKernel,
	useHasConsentPreferences,
	usePolicyRule,
	usePromptRequirement,
} from '../composables/kernel';
import { useDevToolsLauncher } from '../composables/use-devtools-launcher';
import { useDraggable } from '../composables/use-draggable';
import { useLocalStorageRef } from '../composables/use-local-storage-ref';
import { useMounted } from '../composables/use-mounted';
import { useWindowSize } from '../composables/use-window-size';
import { slotAttrs } from '../utils/slot-attrs';
import TriggerIcon from './trigger-icon.vue';

const activeUI = useConsentActiveUI();
const config = useConsentConfig();
const policy = usePolicyRule();
const init = useConsentInit();

const STORAGE_KEY = 'c15t:dialog-trigger-position';
const FALLBACK_OFFSET = 20;
const TOOLBAR_LABEL = 'Privacy controls';
const DEVTOOLS_LABEL = 'c15t DevTools';

const mounted = useMounted();
const { width, height } = useWindowSize();
const triggerRef = ref<HTMLElement | null>(null);
const persistedPosition = useLocalStorageRef<{ x: number; y: number } | null>(
	STORAGE_KEY,
	null
);

const hasConsentUi = useHasConsentPreferences();
const promptRequirement = usePromptRequirement();
const isVisible = computed(() => {
	if (!mounted.value) {
		return false;
	}
	// Nothing to manage without a resolved policy.
	if (!hasConsentUi.value) {
		return false;
	}
	// Keep persistent preferences accessible while a notice is open.
	if (activeUI.value === 'manager') {
		return false;
	}
	const showWhen = config.value.triggerShowWhen;
	if (showWhen === 'never') {
		return false;
	}
	// `after-consent` waits until no prompt is owed: a choice saved or a
	// notice dismissed, the same rule as React's `after-prompt`.
	return showWhen === 'always' || promptRequirement.value.kind === 'none';
});

// With <ConsentDevTools> mounted, the trigger becomes a two-item toolbar
// that carries the DevTools launcher, so one control occupies the corner.
const devTools = useDevToolsLauncher(useConsentKernel(), isVisible);
const showToolbar = devTools.available;
const devToolsOpen = devTools.isOpen;

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

/** Width and height the trigger takes up on screen. */
const resolveFootprint = function resolveFootprint(
	size: ConsentDialogTriggerSize
): { width: number; height: number } {
	const sizePixels = resolveSizePixels(size);
	if (!showToolbar.value) {
		return { height: sizePixels, width: sizePixels };
	}
	const element = triggerRef.value;
	if (element?.offsetWidth && element.offsetHeight) {
		return { height: element.offsetHeight, width: element.offsetWidth };
	}
	// Two items, the divider between them, and the toolbar's border.
	return { height: sizePixels + 2, width: sizePixels * 2 + 3 };
};

// Resolve the same CSS length as class-positioned triggers, including rem,
// calc(), and caller overrides inherited by the rendered trigger.
const resolveOffset = function resolveOffset(): number {
	const trigger = triggerRef.value;
	if (!trigger) {
		return FALLBACK_OFFSET;
	}
	const probe = document.createElement('span');
	probe.style.cssText =
		'position:absolute;visibility:hidden;padding-left:var(--cdt-offset,20px)';
	trigger.append(probe);
	const offset = Number.parseFloat(getComputedStyle(probe).paddingLeft);
	probe.remove();
	return Number.isFinite(offset) ? offset : FALLBACK_OFFSET;
};

const resolveInitialPosition = function resolveInitialPosition(
	position: ConsentDialogTriggerPosition,
	size: ConsentDialogTriggerSize
) {
	const footprint = resolveFootprint(size);
	const offset = resolveOffset();
	const maxX = Math.max(width.value - footprint.width - offset, offset);
	const maxY = Math.max(height.value - footprint.height - offset, offset);
	if (position === 'top-left') {
		return { x: offset, y: offset };
	}
	if (position === 'top-right') {
		return { x: maxX, y: offset };
	}
	if (position === 'bottom-left') {
		return { x: offset, y: maxY };
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
	[mounted, width, height, activeUI, showToolbar],
	() => {
		if (!mounted.value || isDragging.value) {
			return;
		}
		if (persistedPosition.value) {
			// The toolbar is wider than the button saved there; keep it on
			// screen.
			if (showToolbar.value) {
				const footprint = resolveFootprint(config.value.triggerSize ?? 'md');
				const offset = resolveOffset();
				position.value = {
					x: Math.max(
						Math.min(position.value.x, width.value - footprint.width - offset),
						0
					),
					y: Math.max(
						Math.min(
							position.value.y,
							height.value - footprint.height - offset
						),
						0
					),
				};
			}
			return;
		}

		const next = resolveInitialPosition(
			config.value.triggerDefaultPosition ?? 'bottom-right',
			config.value.triggerSize ?? 'md'
		);
		position.value = next;
	},
	{ flush: 'post', immediate: true }
);

const triggerStyle = computed(() => ({
	left: `${position.value.x}px`,
	position: 'fixed' as const,
	top: `${position.value.y}px`,
	zIndex: 9999,
}));

const openDialog = function openDialog() {
	activeUI.value = 'manager';
};

// The corner the toolbar sits nearest, settled when a drag ends.
const corner = ref<CornerPosition>('bottom-right');
watch(
	[position, isDragging, width, height, showToolbar],
	() => {
		if (isDragging.value) {
			return;
		}
		const footprint = resolveFootprint(config.value.triggerSize ?? 'md');
		corner.value = calculateNearestCorner(
			position.value.x + footprint.width / 2,
			position.value.y + footprint.height / 2,
			width.value,
			height.value
		);
	},
	{ flush: 'post', immediate: true }
);

// Keep a docked DevTools panel beside the toolbar as it moves corners or
// changes size. Skip mid-drag; the drop re-runs this.
watch(
	[devTools.instance, triggerRef, corner, isDragging],
	([instance, element, nextCorner, dragging], _previous, onCleanup) => {
		if (!instance || !element || dragging) {
			return;
		}
		onCleanup(
			followDevToolsDock(element, nextCorner, (placement) =>
				instance.dock(placement)
			)
		);
	},
	{ flush: 'post', immediate: true }
);

type ToolbarItemKind = 'preferences' | 'devtools';

// Preferences sits in the corner; DevTools, a development aid, sits
// farthest from it.
const toolbarItems = computed<readonly ToolbarItemKind[]>(() => {
	if (!devTools.instance.value) {
		return ['preferences'];
	}
	return corner.value.endsWith('left')
		? ['preferences', 'devtools']
		: ['devtools', 'preferences'];
});

const preferencesRight = computed(() =>
	policy.value.rights.includes('opt-out') ? 'opt-out' : 'preferences'
);

const sizeClassMap = {
	lg: triggerStyles.lg,
	md: triggerStyles.md,
	sm: triggerStyles.sm,
} as const satisfies Record<ConsentDialogTriggerSize, string>;

const sizeClass = computed(
	() =>
		sizeClassMap[(config.value.triggerSize ?? 'md') as ConsentDialogTriggerSize]
);

const activeItem = ref<ToolbarItemKind>('preferences');
const focusedItem = computed<ToolbarItemKind>(() =>
	toolbarItems.value.includes(activeItem.value)
		? activeItem.value
		: 'preferences'
);
const itemElements = new Map<ToolbarItemKind, HTMLButtonElement>();
const setItemElement = function setItemElement(
	kind: ToolbarItemKind,
	element: unknown
) {
	if (element instanceof HTMLButtonElement) {
		itemElements.set(kind, element);
	} else {
		itemElements.delete(kind);
	}
};

const handleToolbarKeyDown = function handleToolbarKeyDown(
	event: KeyboardEvent
) {
	const items = toolbarItems.value;
	const index = items.indexOf(focusedItem.value);
	let next: ToolbarItemKind | undefined;
	if (event.key === 'ArrowRight') {
		next = items[(index + 1) % items.length];
	} else if (event.key === 'ArrowLeft') {
		next = items[(index - 1 + items.length) % items.length];
	} else if (event.key === 'Home') {
		next = items.at(0);
	} else if (event.key === 'End') {
		next = items.at(-1);
	}
	if (!next) {
		return;
	}
	event.preventDefault();
	activeItem.value = next;
	itemElements.get(next)?.focus();
};

const selectItem = function selectItem(kind: ToolbarItemKind) {
	if (kind === 'devtools') {
		devTools.instance.value?.toggle();
		return;
	}
	openDialog();
};
</script>

<template>
	<Teleport
		v-if="mounted"
		to="body"
	>
		<div
			v-if="isVisible && showToolbar"
			ref="triggerRef"
			v-bind="
				slotAttrs(config.components?.trigger?.toolbar, [
					triggerStyles.toolbar,
					isDragging && triggerStyles.dragging,
				])
			"
			role="toolbar"
			:aria-label="TOOLBAR_LABEL"
			aria-orientation="horizontal"
			dir="ltr"
			tabindex="-1"
			:data-corner="corner"
			data-c15t-trigger-toolbar="true"
			data-c15t-trigger="true"
			:data-dragging="isDragging ? true : undefined"
			:data-disable-animation="config.disableAnimation ? true : undefined"
			:style="[config.components?.trigger?.toolbar?.style, triggerStyle]"
			@keydown="handleToolbarKeyDown"
		>
			<button
				v-for="kind in toolbarItems"
				:key="kind"
				:ref="(element) => setItemElement(kind, element)"
				v-bind="
					slotAttrs(config.components?.trigger?.toolbarItem, [
						triggerStyles.toolbarItem,
						sizeClass,
					])
				"
				type="button"
				:aria-label="
					kind === 'devtools' ? DEVTOOLS_LABEL : config.triggerAriaLabel
				"
				:aria-expanded="kind === 'devtools' ? devToolsOpen : undefined"
				:data-c15t-rights="
					kind === 'preferences' ? policy.rights.join(' ') : undefined
				"
				:data-c15t-trigger-action="kind"
				:data-c15t-trigger-item="kind"
				:data-right="kind === 'preferences' ? preferencesRight : undefined"
				:tabindex="kind === focusedItem ? 0 : -1"
				@click="selectItem(kind)"
				@focus="activeItem = kind"
			>
				<span
					v-bind="
						slotAttrs(
							config.components?.trigger?.toolbarIcon,
							triggerStyles.toolbarIcon
						)
					"
					aria-hidden="true"
				>
					<svg
						v-if="kind === 'devtools'"
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="m18 16 4-4-4-4" />
						<path d="m6 8-4 4 4 4" />
						<path d="m14.5 4-5 16" />
					</svg>
					<TriggerIcon
						v-else
						:icon="config.triggerIcon"
						:branding="init?.branding"
					/>
				</span>
			</button>
		</div>
		<button
			v-else-if="isVisible"
			ref="triggerRef"
			v-bind="
				slotAttrs(config.components?.trigger?.root, triggerStyles.trigger)
			"
			type="button"
			data-testid="consent-dialog-trigger"
			data-c15t-trigger="true"
			:data-c15t-rights="policy.rights.join(' ')"
			:data-size="config.triggerSize"
			:data-dragging="isDragging ? true : undefined"
			:data-disable-animation="config.disableAnimation ? true : undefined"
			:style="[config.components?.trigger?.root?.style, triggerStyle]"
			:aria-label="config.triggerAriaLabel"
			@click="openDialog"
		>
			<span
				v-bind="slotAttrs(config.components?.trigger?.icon, triggerStyles.icon)"
				aria-hidden="true"
			>
				<TriggerIcon
					:icon="config.triggerIcon"
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
