<script setup lang="ts">
import type { PresentationAction } from '@c15t/core';
import type { CONSENT_CATEGORY } from '@c15t/core/consent-record';
import accordionStyles from '@c15t/ui/styles/components/accordion';
import dialogStyles from '@c15t/ui/styles/components/consent-dialog';
import managerStyles from '@c15t/ui/styles/components/consent-manager';
import { computed, nextTick, ref, watch } from 'vue';
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
	AccordionContent,
	AccordionHeader,
	AccordionItem,
	AccordionRoot,
	AccordionTrigger,
	DialogContent,
	DialogOverlay,
	DialogPortal,
	DialogRoot,
} from '../primitives';
import ConsentActions from './consent-actions.vue';
import ConsentDescription from './consent-description.vue';
import ConsentSwitch from './consent-switch.vue';
import ConsentTag from './consent-tag.vue';

const init = useConsentInit();

const activeUI = useConsentActiveUI();
const config = useConsentConfig();
const save = useConsentSave();
const snapshot = useConsentSnapshot();

const {
	presentation: surface,
	actionGroups,
	direction,
	primaryActions,
	shouldFillActions,
} = useConsentPolicyActions('preferences');
const {
	values: draft,
	displayedCategories: draftCategories,
	isStale,
	reset: resetDraft,
	save: saveDraft,
} = useConsentDraft();

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

const consentTitle = function consentTitle(category: CONSENT_CATEGORY) {
	const types = init.value?.translations?.translations?.consentTypes as
		| Record<string, { title?: string }>
		| undefined;
	const title = types?.[category]?.title;
	if (title) {
		return title;
	}

	return category
		.replace(/_/gu, ' ')
		.replace(/\b\w/gu, (character) => character.toUpperCase());
};

watch(
	activeUI,
	(ui) => {
		if (ui === 'manager') {
			resetDraft();
		}
	},
	{ immediate: true }
);

const labels = computed(() => {
	const common = init.value?.translations?.translations?.common;
	return {
		accept: common?.acceptAll ?? 'Accept all',
		reject: common?.rejectAll ?? 'Reject all',
		save: common?.save ?? 'Save',
	} as const;
});

const actionTestIds = {
	accept: 'consent-widget-footer-accept-all-button',
	reject: 'consent-widget-reject-button',
	save: 'consent-widget-footer-save-button',
} as const;

const onAction = async function onAction(action: PresentationAction) {
	let result;
	if (action === 'save') {
		result = await saveDraft();
	} else if (action === 'accept') {
		result = await save('all');
	} else if (action === 'reject') {
		result = await save('none');
	}
	if (result?.ok) {
		activeUI.value =
			snapshot.value.promptRequirement.kind === 'none' ? null : 'banner';
	}
};
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
							<div
								v-bind="config.components?.manager?.root"
								data-testid="consent-widget-root"
								:class="managerStyles.manager"
								:data-disable-animation="
									config?.disableAnimation ? true : undefined
								"
							>
								<AccordionRoot
									v-bind="
										config.components?.accordion?.root as Omit<
											HTMLAttributes,
											'dir'
										>
									"
									type="single"
									collapsible
									:unmount-on-hide="false"
									data-testid="consent-widget-accordion"
									:class="accordionStyles.list"
								>
									<AccordionItem
										v-for="(_enabled, category) in draft"
										:key="category"
										:value="category"
										v-bind="config.components?.['accordion-item']?.root"
										:data-testid="`consent-widget-accordion-item-${category}`"
										:unmount-on-hide="false"
										:class="accordionStyles.item"
									>
										<AccordionHeader as-child>
											<div
												v-bind="config.components?.accordion?.triggerRow"
												:class="accordionStyles.triggerRow"
											>
												<AccordionTrigger
													as-child
													v-bind="
														config.components?.['accordion-item']?.trigger
													"
													:data-testid="`consent-widget-accordion-trigger-${category}`"
												>
													<div :class="accordionStyles.trigger">
														<span
															v-bind="config.components?.accordion?.arrow"
															:class="accordionStyles.arrow"
															:data-testid="`consent-widget-accordion-arrow-${category}`"
														>
															<svg
																xmlns="http://www.w3.org/2000/svg"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
															>
																<title>Open</title>
																<path d="M5 12h14M12 5v14" />
															</svg>
														</span>
														<span
															v-bind="config.components?.accordion?.header"
															:class="accordionStyles.header"
														>
															<h3
																v-bind="config.components?.accordion?.title"
																:class="accordionStyles.title"
															>
																{{ consentTitle(category) }}
															</h3>
														</span>
													</div>
												</AccordionTrigger>
												<div
													v-bind="config.components?.accordion?.control"
													:class="accordionStyles.control"
												>
													<ConsentSwitch
														size="small"
														v-model="draft[category]"
														:disabled="category === 'necessary'"
														:aria-label="consentTitle(category)"
														:data-testid="`consent-widget-switch-${category}`"
													/>
												</div>
											</div>
										</AccordionHeader>
										<AccordionContent
											v-bind="config.components?.['accordion-item']?.content"
											:data-testid="`consent-widget-accordion-content-${category}`"
											:class="accordionStyles.content"
										>
											<div
												v-bind="config.components?.accordion?.contentViewport"
												:class="accordionStyles.contentViewport"
											>
												<div
													v-bind="config.components?.accordion?.contentInner"
													:class="accordionStyles.contentInner"
												>
													{{
														(
															init?.translations?.translations
																?.consentTypes as Record<
																string,
																{ description?: string }
															>
														)?.[category]?.description
													}}
												</div>
											</div>
										</AccordionContent>
									</AccordionItem>
								</AccordionRoot>
								<div
									v-bind="config.components?.manager?.footer"
									data-testid="consent-widget-footer"
									:class="managerStyles.footer"
								>
									<ConsentActions
										:disabled="isStale"
										:action-groups="actionGroups"
										:direction="direction"
										:ui-profile="surface?.uiProfile"
										:primary-actions="primaryActions"
										:fill="shouldFillActions"
										:labels="labels"
										:test-ids="actionTestIds"
										:root-attrs="
											config.components?.manager?.actions as object | undefined
										"
										:group-attrs="
											config.components?.manager?.actionGroup as
												object | undefined
										"
										@action="onAction"
									/>
								</div>
							</div>
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
