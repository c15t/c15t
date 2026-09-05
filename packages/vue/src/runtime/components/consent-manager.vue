<script setup lang="ts">
import { getConsentAvailableCategories } from '@c15t/core/consent-record';
import type { CONSENT_CATEGORY } from '@c15t/core/consent-record';
import type { PolicyUiAction } from '@c15t/schema/types';
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
	useHasConsent,
} from '../composables';
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
const granted = useHasConsent();
const activeUI = useConsentActiveUI();
const config = useConsentConfig();
const save = useConsentSave();
const DEFAULT_ACTIONS: PolicyUiAction[] = ['reject', 'accept', 'customize'];
const surface = computed(() => init.value?.policy?.ui?.dialog);
const { actionGroups, direction, primaryActions, shouldFillActions } =
	useConsentPolicyActions(surface);
const draft = ref<Record<CONSENT_CATEGORY, boolean>>(
	{} as Record<CONSENT_CATEGORY, boolean>
);

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
	computed(
		() =>
			activeUI.value === 'manager' &&
			Boolean(init.value?.policy?.ui?.dialog?.scrollLock)
	)
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

const reset = function reset() {
	const categories = getConsentAvailableCategories(
		init.value,
		config.value.consentCategories
	);

	const grantedSet = new Set(granted.value);
	const next = {} as Record<CONSENT_CATEGORY, boolean>;
	for (const category of categories) {
		next[category] = category === 'necessary' || grantedSet.has(category);
	}
	draft.value = next;
};

watch(
	activeUI,
	(ui) => {
		if (ui === 'manager') {
			reset();
		}
	},
	{ immediate: true }
);

const labels = computed(() => {
	const common = init.value?.translations?.translations?.common;
	return {
		accept: common?.acceptAll ?? 'Accept all',
		customize: common?.save ?? 'Save',
		reject: common?.rejectAll ?? 'Reject all',
	} as const;
});

const actionTestIds = {
	accept: 'consent-widget-footer-accept-all-button',
	customize: 'consent-widget-footer-save-button',
	reject: 'consent-widget-reject-button',
} as const;

const savePreferences = function savePreferences() {
	const selected = Object.entries(draft.value)
		.filter(([, enabled]) => enabled)
		.map(([category]) => category as CONSENT_CATEGORY);
	save(selected);
};

const onAction = function onAction(action: PolicyUiAction) {
	if (action === 'customize') {
		savePreferences();
		activeUI.value = null;
		return;
	}
	if (action === 'accept') {
		save('all');
		activeUI.value = null;
		return;
	}
	if (action === 'reject') {
		save('none');
		activeUI.value = null;
	}
};
</script>

<template>
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
							:class="dialogStyles.header"
						>
							<h2
								v-bind="config.components?.dialog?.title"
								data-testid="consent-dialog-title"
								id="consent-dialog-title"
								:class="dialogStyles.title"
							>
								{{
									init?.translations?.translations?.consentManagerDialog?.title
								}}
							</h2>
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
										:action-groups="
											actionGroups.length ? actionGroups : [DEFAULT_ACTIONS]
										"
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
