<script setup lang="ts">
import { saveConsentSurface } from '@c15t/core';
import type { PresentationAction, SaveResult } from '@c15t/core';
import dialogStyles from '@c15t/ui/styles/components/consent-dialog';

import '@c15t/ui/styles/components/consent-dialog.css';
import { getTextDirection } from '@c15t/ui/utils';
import { computed, nextTick, onUnmounted, provide, ref, watch } from 'vue';
import type { HTMLAttributes } from 'vue';

import {
	useConsentActiveUI,
	useConsentConfig,
	useConsentInit,
	useConsentKernel,
	useConsentSave,
	useHasConsentUi,
} from '../composables';
import { useConsentDraft } from '../composables/draft';
import { useConsentPolicyActions } from '../composables/use-consent-policy-actions';
import { useConsentScrollLock } from '../composables/use-consent-scroll-lock';
import {
	DialogContent,
	DialogOverlay,
	DialogPortal,
	DialogRoot,
} from '../primitives';
import { slotAttrs } from '../utils/slot-attrs';
import ConsentDescription from './description.vue';
import { consentWidgetManagerKey } from './preferences-manager-context';
import ConsentWidget from './preferences.vue';
import ConsentTag from './tag.vue';

const props = withDefaults(
	defineProps<{
		/** Skip the enter and exit animations. Defaults to the config's. */
		disableAnimation?: boolean;
	}>(),
	{ disableAnimation: undefined }
);

const init = useConsentInit();
const textDirection = computed(() =>
	getTextDirection(init.value?.translations?.language)
);

const activeUI = useConsentActiveUI();
const config = useConsentConfig();
const save = useConsentSave();
const kernel = useConsentKernel();
// No resolved policy means nothing to manage: render no surface at all.
const hasConsentUi = useHasConsentUi();

const { presentation: surface } = useConsentPolicyActions('preferences');
let pendingActions = 0;
let actionSequence = 0;
let applyingSave = false;
const draftState = useConsentDraft(() => pendingActions === 0);
const {
	isStale,
	reseedOnNextRecord,
	reset: resetDraft,
	save: saveDraft,
} = draftState;

const disableAnimation = computed(() =>
	Boolean(props.disableAnimation ?? config.value.disableAnimation)
);
const isOverlayVisible = computed(() => activeUI.value === 'manager');
const overlayFallbackStyle = ref<Record<string, string> | undefined>();

const refreshOverlayFallback = async function refreshOverlayFallback() {
	if (typeof window === 'undefined' || activeUI.value !== 'manager') {
		overlayFallbackStyle.value = undefined;
		return;
	}

	await nextTick();
	const rootStyle = getComputedStyle(document.documentElement);
	if (
		rootStyle
			.getPropertyValue('--consent-dialog-overlay-background-color')
			.trim()
	) {
		overlayFallbackStyle.value = undefined;
		return;
	}

	overlayFallbackStyle.value = {
		backgroundColor: 'var(--c15t-overlay, hsla(0, 0%, 0%, 0.5))',
		inset: '0',
		position: 'fixed',
		zIndex: '999998',
	};
};

watch(
	activeUI,
	() => {
		void refreshOverlayFallback();
	},
	{ immediate: true }
);

useConsentScrollLock(
	computed(() => activeUI.value === 'manager' && surface.value.scrollLock)
);

watch(
	activeUI,
	(ui) => {
		if (ui === 'manager') {
			resetDraft();
		}
	},
	{ immediate: true }
);

// Explicit close/reopen and newer actions invalidate an older completion.
watch(
	activeUI,
	(ui) => {
		if (!applyingSave && ui !== 'manager') {
			actionSequence += 1;
		}
	},
	{ flush: 'sync' }
);
onUnmounted(() => {
	actionSequence += 1;
});

const onAction = async function onAction(action: PresentationAction) {
	actionSequence += 1;
	if (action !== 'save' && action !== 'accept' && action !== 'reject') {
		return;
	}
	const sequence = actionSequence;
	const fromManager = activeUI.value === 'manager';
	pendingActions += 1;
	try {
		applyingSave = true;
		let pending: Promise<SaveResult>;
		try {
			// The manager closes in this task once the kernel has recorded the
			// choice, and the backend request finishes in the background; see
			// `saveConsentSurface`. Reopening reseeds the draft from the record.
			pending = saveConsentSurface(
				kernel,
				() => {
					if (action === 'save') {
						return saveDraft();
					}
					reseedOnNextRecord();
					return save(action === 'accept' ? 'all' : 'none');
				},
				() => sequence === actionSequence
			);
			if (fromManager && activeUI.value !== 'manager') {
				actionSequence += 1;
			}
		} finally {
			applyingSave = false;
		}
		const result = await pending;
		// The draft does not sync while an action is pending, so it follows
		// the record once this action, and no newer one, has succeeded; a
		// failed action keeps the visible draft for the visitor to retry.
		if (result.ok && sequence === actionSequence) {
			resetDraft();
		}
	} finally {
		pendingActions -= 1;
	}
};
provide(consentWidgetManagerKey, { draft: draftState, onAction });
</script>

<template>
	<div
		v-if="hasConsentUi && isStale"
		role="status"
	>
		Privacy choices have changed.
		<button
			type="button"
			@click="resetDraft"
		>
			Review updated choices
		</button>
	</div>
	<DialogRoot
		v-if="hasConsentUi"
		:open="activeUI === 'manager'"
		:modal="surface.blocking"
		@update:open="(open) => (activeUI = open ? 'manager' : null)"
	>
		<DialogPortal>
			<DialogOverlay
				v-if="surface.blocking"
				:style="overlayFallbackStyle"
				v-bind="
					slotAttrs(config.components?.dialog?.overlay, [
						dialogStyles.overlay,
						isOverlayVisible
							? dialogStyles.overlayVisible
							: dialogStyles.overlayHidden,
					])
				"
				data-testid="consent-dialog-overlay"
				:data-disable-animation="disableAnimation ? true : undefined"
			/>
			<!-- The outer element only positions the panel over the
			     viewport. `DialogContent` is the panel itself: it carries the
			     dialog semantics, the focus trap and the
			     `consent-dialog-root` testid, so those name the same element
			     they do in React and Svelte. -->
			<div
				v-bind="config.components?.dialog?.root"
				data-mode="dialog"
				data-slot="dialog-positioner"
				:class="dialogStyles.root"
				:data-disable-animation="disableAnimation ? true : undefined"
				aria-labelledby="consent-dialog-title"
				aria-describedby="consent-dialog-description"
			>
				<DialogContent
					v-bind="
						slotAttrs(config.components?.dialog?.container, [
							dialogStyles.container,
							dialogStyles.contentVisible,
						])
					"
					:data-blocking="surface.blocking ? 'true' : undefined"
					data-testid="consent-dialog-root"
					:dir="textDirection"
					aria-labelledby="consent-dialog-title"
					aria-describedby="consent-dialog-description"
				>
					<div
						v-bind="
							slotAttrs(config.components?.dialog?.card, dialogStyles.card)
						"
						data-testid="consent-dialog-card"
						tabindex="-1"
					>
						<div
							v-bind="
								slotAttrs(
									config.components?.dialog?.header,
									dialogStyles.header
								)
							"
							data-testid="consent-dialog-header"
						>
							<h2
								v-bind="
									slotAttrs(
										config.components?.dialog?.title,
										dialogStyles.title
									)
								"
								data-testid="consent-dialog-title"
								id="consent-dialog-title"
							>
								{{
									init?.translations?.translations?.consentManagerDialog?.title
								}}
							</h2>
							<ConsentDescription context="dialog" />
						</div>
						<div
							v-bind="
								slotAttrs(
									config.components?.dialog?.content,
									dialogStyles.content
								)
							"
							data-testid="consent-dialog-content"
						>
							<ConsentWidget />
						</div>
						<ConsentTag
							v-if="!(config.dialogHideBranding ?? config.hideBranding)"
							context="dialog"
						/>
					</div>
				</DialogContent>
			</div>
		</DialogPortal>
	</DialogRoot>
</template>
