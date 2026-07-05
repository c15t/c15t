<script
	setup
	lang="ts"
>
import accordionStyles from '@c15t/ui/styles/v3/accordion.module.css';
import dialogStyles from '@c15t/ui/styles/v3/consent-dialog.module.css';
import managerStyles from '@c15t/ui/styles/v3/consent-manager.module.css';
import type { PolicyUiAction } from '@c15t/schema/types';
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
import {
	getConsentAvailableCategories,
	type CONSENT_CATEGORY,
} from 'c15t/v3/consent-record';
import { computed, type HTMLAttributes, nextTick, ref, watch } from 'vue';
import {
	useConsentActiveUI,
	useConsentConfig,
	useConsentInit,
	useHasConsent,
	useConsentSave,
} from '../composables';
import { useConsentPolicyActions } from '../composables/use-consent-policy-actions';
import { useConsentScrollLock } from '../composables/use-consent-scroll-lock';
import ConsentDescription from './consent-description.vue';
import ConsentActions from './consent-actions.vue';
import ConsentSwitch from './consent-switch.vue';
import ConsentTag from './consent-tag.vue';

const init = useConsentInit();
const granted = useHasConsent();
const activeUI = useConsentActiveUI();
const config = useConsentConfig();
const save = useConsentSave();
const DEFAULT_ACTIONS: PolicyUiAction[] = ['reject', 'accept', 'customize'];
const surface = computed(() => init.value?.policy?.ui?.dialog);
const {
	actionGroups,
	direction,
	primaryActions,
	shouldFillActions,
} = useConsentPolicyActions(surface);
const managerComponents = computed(
	() =>
		config.value.components?.manager as
			| {
					actions?: Record<string, unknown>;
					actionGroup?: Record<string, unknown>;
			  }
			| undefined
);

const draft = ref<Record<CONSENT_CATEGORY, boolean>>(
	{} as Record<CONSENT_CATEGORY, boolean>
);

const disableAnimation = computed(() => Boolean(config.value.disableAnimation));
const isOverlayVisible = computed(() => activeUI.value === 'manager');
const overlayFallbackStyle = ref<Record<string, string> | undefined>();

async function refreshOverlayFallback() {
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
		position: 'fixed',
		inset: '0',
		backgroundColor:
			'var(--c15t-overlay, hsla(0, 0%, 0%, 0.5))',
		zIndex: '999999998',
	};
}

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

function consentTitle(category: CONSENT_CATEGORY) {
	const types = init.value?.translations?.translations?.consentTypes as
		| Record<string, { title?: string }>
		| undefined;
	const title = types?.[category]?.title;
	if (title) return title;

	return category
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (character) => character.toUpperCase());
}

function reset() {
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
}

watch(
	activeUI,
	(ui) => {
		if (ui === 'manager') reset();
	},
	{ immediate: true }
);

const labels = computed(() => {
	const common = init.value?.translations?.translations?.common;
	return {
		accept: common?.acceptAll ?? 'Accept all',
		reject: common?.rejectAll ?? 'Reject all',
		customize: common?.save ?? 'Save',
	} as const;
});

const actionTestIds = {
	accept: 'consent-widget-footer-accept-all-button',
	reject: 'consent-widget-reject-button',
	customize: 'consent-widget-footer-save-button',
} as const;

function savePreferences() {
	const selected = Object.entries(draft.value)
		.filter(([, enabled]) => enabled)
		.map(([category]) => category as CONSENT_CATEGORY);
	save(selected);
}

function onAction(action: PolicyUiAction) {
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
}
</script>

<template>
	<DialogRoot
		:open="activeUI === 'manager'"
		:modal="config.trapFocus"
		@update:open="(open) => activeUI = open ? 'manager' : null"
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
				<div :class="dialogStyles.container">
					<div
						v-bind="config.components?.dialog?.card"
						data-testid="consent-dialog-card"
						:class="dialogStyles.card"
					>
						<div
							v-bind="config.components?.dialog?.header"
							:class="dialogStyles.header"
						>
							<div
								v-bind="config.components?.dialog?.title"
								data-testid="consent-dialog-title"
								id="consent-dialog-title"
								:class="dialogStyles.title"
							>
								{{ init?.translations?.translations?.consentManagerDialog?.title }}
							</div>
							<ConsentDescription context="dialog" />
						</div>
						<div
							v-bind="config.components?.dialog?.content"
							:class="dialogStyles.content"
						>
							<div
								v-bind="config.components?.manager?.root"
								data-testid="consent-manager-root"
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
									data-testid="consent-manager-accordion"
									:class="accordionStyles.list"
								>
									<AccordionItem
										v-for="(_enabled, category) in draft"
										:key="category"
										:value="category"
										v-bind="config.components?.['accordion-item']?.root"
										:data-testid="`consent-manager-accordion-item-${category}`"
										:unmount-on-hide="false"
										:class="accordionStyles.item"
									>
										<AccordionHeader as-child>
											<div :class="accordionStyles.triggerRow">
												<AccordionTrigger
													as-child
													v-bind="config.components?.['accordion-item']?.trigger"
													:data-testid="`consent-manager-accordion-trigger-${category}`"
												>
													<div :class="accordionStyles.trigger">
														<span
															:class="accordionStyles.arrow"
															:data-testid="`consent-manager-accordion-arrow-${category}`"
															aria-hidden="true"
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
																<path d="M5 12h14M12 5v14" />
															</svg>
														</span>
														<span :class="accordionStyles.header">
															<h3 :class="accordionStyles.title">
																{{ consentTitle(category) }}
															</h3>
														</span>
													</div>
												</AccordionTrigger>
												<div :class="accordionStyles.control">
													<ConsentSwitch
														size="small"
														v-model="draft[category]"
														:disabled="category === 'necessary'"
														:aria-label="consentTitle(category)"
														:data-testid="`consent-manager-switch-${category}`"
													/>
												</div>
											</div>
										</AccordionHeader>
										<AccordionContent
											v-bind="config.components?.['accordion-item']?.content"
											:data-testid="`consent-manager-accordion-content-${category}`"
											:class="accordionStyles.content"
										>
											<div :class="accordionStyles.contentViewport">
												<div :class="accordionStyles.contentInner">
													{{ (
															init?.translations?.translations
																?.consentTypes as Record<
																string,
																{ description?: string }
															>
														)?.[category]?.description }}
												</div>
											</div>
										</AccordionContent>
									</AccordionItem>
								</AccordionRoot>
								<div
									v-bind="config.components?.manager?.footer"
									data-testid="consent-manager-footer"
									:class="managerStyles.footer"
								>
									<ConsentActions
										:action-groups="actionGroups.length ? actionGroups : [DEFAULT_ACTIONS]"
										:direction="direction"
										:ui-profile="surface?.uiProfile"
										:primary-actions="primaryActions"
										:fill="shouldFillActions"
										:labels="labels"
										:test-ids="actionTestIds"
										:root-attrs="managerComponents?.actions"
										:group-attrs="managerComponents?.actionGroup"
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
