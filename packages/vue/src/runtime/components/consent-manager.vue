<script setup lang="ts">
import type { PresentationAction } from '@c15t/core';
import dialogStyles from '@c15t/ui/styles/components/consent-dialog';
import { computed, nextTick, onUnmounted, provide, ref, watch } from 'vue';
import type { HTMLAttributes } from 'vue';

import {
	useConsentActiveUI,
	useConsentConfig,
	useConsentInit,
	useConsentSave,
	useConsentSnapshot,
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
import ConsentDescription from './consent-description.vue';
import ConsentTag from './consent-tag.vue';
import { consentWidgetManagerKey } from './consent-widget-manager-context';
import ConsentWidget from './consent-widget.vue';

const init = useConsentInit();

const activeUI = useConsentActiveUI();
const config = useConsentConfig();
const save = useConsentSave();
const snapshot = useConsentSnapshot();

const { presentation: surface } = useConsentPolicyActions('preferences');
let pendingActions = 0;
let actionSequence = 0;
let applyingSave = false;
const draftState = useConsentDraft(() => pendingActions === 0);
const { isStale, reset: resetDraft, save: saveDraft } = draftState;

const disableAnimation = computed(() => Boolean(config.value.disableAnimation));
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

// A local receipt can hide the kernel prompt before its transport settles.
// Explicit close/reopen and newer actions invalidate the older completion.
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
	const sequence = actionSequence;
	const preserveManager = activeUI.value === 'manager';
	pendingActions += 1;
	try {
		applyingSave = true;
		let pending;
		try {
			if (action === 'save') {
				pending = saveDraft();
			} else if (action === 'accept') {
				pending = save('all');
			} else if (action === 'reject') {
				pending = save('none');
			}
			if (preserveManager && sequence === actionSequence) {
				activeUI.value = 'manager';
			}
		} finally {
			applyingSave = false;
		}
		const result = await pending;
		if (result?.ok && preserveManager && sequence === actionSequence) {
			activeUI.value =
				snapshot.value.promptRequirement.kind === 'none' ? null : 'banner';
		}
	} finally {
		pendingActions -= 1;
	}
};
provide(consentWidgetManagerKey, { draft: draftState, onAction });
</script>

<template>
	<div
		v-if="isStale"
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
		:open="activeUI === 'manager'"
		:modal="config.trapFocus"
		@update:open="(open) => (activeUI = open ? 'manager' : null)"
	>
		<DialogPortal>
			<DialogOverlay
				:style="overlayFallbackStyle"
				v-bind="config.components?.dialog?.overlay"
				data-testid="consent-dialog-overlay"
				:class="[
					dialogStyles.overlay,
					isOverlayVisible
						? dialogStyles.overlayVisible
						: dialogStyles.overlayHidden,
				]"
				:data-disable-animation="disableAnimation ? true : undefined"
			/>
			<DialogContent
				v-bind="config.components?.dialog?.root"
				data-testid="consent-dialog-root"
				data-mode="dialog"
				:class="dialogStyles.root"
				:data-disable-animation="disableAnimation ? true : undefined"
				aria-labelledby="consent-dialog-title"
				aria-describedby="consent-dialog-description"
			>
				<div
					v-bind="config.components?.dialog?.container"
					:class="dialogStyles.container"
				>
					<div
						v-bind="config.components?.dialog?.card"
						data-testid="consent-dialog-card"
						:class="dialogStyles.card"
					>
						<div
							v-bind="config.components?.dialog?.header"
							data-testid="consent-dialog-header"
							:class="dialogStyles.header"
						>
							<div
								v-bind="config.components?.dialog?.title"
								data-testid="consent-dialog-title"
								id="consent-dialog-title"
								:class="dialogStyles.title"
								role="heading"
								aria-level="2"
							>
								{{
									init?.translations?.translations?.consentManagerDialog?.title
								}}
							</div>
							<ConsentDescription context="dialog" />
						</div>
						<div
							v-bind="config.components?.dialog?.content"
							data-testid="consent-dialog-content"
							:class="dialogStyles.content"
						>
							<ConsentWidget />
						</div>
						<ConsentTag
							v-if="!(config.dialogHideBranding ?? config.hideBranding)"
							context="dialog"
						/>
					</div>
				</div>
			</DialogContent>
		</DialogPortal>
	</DialogRoot>
</template>
