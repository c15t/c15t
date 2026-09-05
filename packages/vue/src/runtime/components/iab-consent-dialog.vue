<script setup lang="ts">
import { resolveIABDialogDisplayModel } from '@c15t/iab/headless';
import type {
	HeadlessIABDisplayRow,
	HeadlessIABDisplayStackRow,
} from '@c15t/iab/headless';
import type { PolicyUiAction } from '@c15t/schema/types';
import { isDialogDismissKey } from '@c15t/ui/primitives/dialog';
import dialogStyles from '@c15t/ui/styles/components/iab-consent-dialog';
import { computed, ref, Teleport, Transition, toValue, watch } from 'vue';

import {
	createDefaultIabSelection,
	useConsentActiveUI,
	useConsentConfig,
	useConsentIabSave,
	useConsentIabSelection,
	useConsentInit,
} from '#c15t/composables';
import type { ConsentIabSelection } from '#c15t/composables';

import { useConsentScrollLock } from '../composables/use-consent-scroll-lock';
import { useFocusTrap } from '../primitives/use-focus-trap';
import ConsentActions from './consent-actions.vue';
import ConsentDialogTrigger from './consent-dialog-trigger.vue';
import ConsentTag from './consent-tag.vue';
import type { IabVendorId } from './iab-purpose-item.vue';
import IabPurposeItem from './iab-purpose-item.vue';
import IabStackItem from './iab-stack-item.vue';
import IabVendorList from './iab-vendor-list.vue';

const IAB_DIALOG_LAYOUT: (PolicyUiAction | PolicyUiAction[])[] = [
	['reject', 'accept'],
	'customize',
];

const activeUI = useConsentActiveUI();
const config = useConsentConfig();
const init = useConsentInit();
const iabSelection = useConsentIabSelection();
const save = useConsentIabSave();

const initValue = computed(() => toValue(init));
const gvl = computed(() => initValue.value?.gvl ?? null);
const customVendors = computed(() => initValue.value?.customVendors ?? []);
const draftIab = ref<ConsentIabSelection>(createDefaultIabSelection());

const isOpen = computed(() => {
	const models = config.value.iabDialogModels;
	const model = initValue.value?.policy?.model;
	const matchesModel =
		!models?.length || (model !== undefined && models.includes(model));
	return (
		activeUI.value === 'manager' &&
		initValue.value?.policy?.model === 'iab' &&
		Boolean(gvl.value) &&
		matchesModel
	);
});
const disableAnimation = computed(() =>
	Boolean(toValue(config).disableAnimation)
);

const showDialog = computed(() => isOpen.value && Boolean(gvl.value));

const activeTab = ref<'purposes' | 'vendors'>('purposes');
const selectedVendorId = ref<IabVendorId | null>(null);
const specialPurposesExpanded = ref(false);

const iabT = computed(
	() =>
		(
			toValue(init)?.translations?.translations as {
				iab?: Record<string, unknown>;
			}
		)?.iab as
			| {
					common?: {
						acceptAll?: string;
						rejectAll?: string;
						saveSettings?: string;
						close?: string;
						loading?: string;
					};
					preferenceCenter?: {
						title?: string;
						description?: string;
						tabs?: { purposes?: string; vendors?: string };
						specialPurposes?: { title?: string; tooltip?: string };
						vendorList?: {
							partnerSingular?: string;
							partnerPlural?: string;
						};
						footer?: { consentStorage?: string };
					};
			  }
			| undefined
);

const labels = computed(() => ({
	accept: iabT.value?.common?.acceptAll ?? 'Accept all',
	customize: iabT.value?.common?.saveSettings ?? 'Save settings',
	reject: iabT.value?.common?.rejectAll ?? 'Reject all',
}));

// Which rows this surface renders, and in what order, comes from the
// shared display model in `@c15t/iab/headless` — the same one React,
// Svelte and the Astro server render read.
const display = computed(() =>
	resolveIABDialogDisplayModel(
		gvl.value ? { customVendors: customVendors.value, gvl: gvl.value } : null
	)
);

const isStackRow = function isStackRow(
	row: HeadlessIABDisplayRow | HeadlessIABDisplayStackRow
): row is HeadlessIABDisplayStackRow {
	return row.kind === 'stack';
};

const isLoading = computed(() => !gvl.value);

const totalVendors = computed(() => display.value.vendorTabCount);

const purposeTabCount = computed(() => display.value.purposeTabCount);

const essentialPartnerCount = computed(
	() => display.value.essentialPartnerCount
);

const setPurposeConsent = function setPurposeConsent(
	purposeId: number,
	value: boolean
) {
	draftIab.value.purposeConsents = {
		...draftIab.value.purposeConsents,
		[purposeId]: value,
	};
};

const setPurposeLegitimateInterest = function setPurposeLegitimateInterest(
	purposeId: number,
	value: boolean
) {
	draftIab.value.purposeLegitimateInterests = {
		...draftIab.value.purposeLegitimateInterests,
		[purposeId]: value,
	};
};

const setVendorConsent = function setVendorConsent(
	vendorId: IabVendorId,
	value: boolean
) {
	draftIab.value.vendorConsents = {
		...draftIab.value.vendorConsents,
		[String(vendorId)]: value,
	};
};

const setSpecialFeatureOptIn = function setSpecialFeatureOptIn(
	featureId: number,
	value: boolean
) {
	draftIab.value.specialFeatureOptIns = {
		...draftIab.value.specialFeatureOptIns,
		[featureId]: value,
	};
};

const syncDraftFromSelection = function syncDraftFromSelection() {
	draftIab.value = structuredClone(iabSelection.value);
};

watch(
	isOpen,
	(open) => {
		if (!open) {
			return;
		}

		syncDraftFromSelection();
		activeTab.value = draftIab.value.preferenceCenterTab;
	},
	{ immediate: true }
);

watch(
	() => iabSelection.value.preferenceCenterTab,
	(tab) => {
		if (isOpen.value) {
			activeTab.value = tab;
			draftIab.value.preferenceCenterTab = tab;
		}
	}
);

const handleTabChange = function handleTabChange(tab: 'purposes' | 'vendors') {
	activeTab.value = tab;
	draftIab.value.preferenceCenterTab = tab;
	iabSelection.value.preferenceCenterTab = tab;
};

const closeDialog = function closeDialog() {
	activeUI.value = null;
};

const onDialogKeydown = function onDialogKeydown(event: KeyboardEvent) {
	if (isDialogDismissKey(event.key)) {
		event.preventDefault();
		closeDialog();
	}
};

const onAction = function onAction(action: PolicyUiAction) {
	if (action === 'customize') {
		save(
			{
				...structuredClone(draftIab.value),
				preferenceCenterTab: activeTab.value,
			},
			activeTab.value
		);
		return;
	}
	if (action === 'accept') {
		save('all', activeTab.value);
		return;
	}
	if (action === 'reject') {
		save('none', activeTab.value);
	}
};

const handleVendorClick = function handleVendorClick(vendorId: IabVendorId) {
	selectedVendorId.value = vendorId;
	handleTabChange('vendors');
};

const scrollLock = computed(
	() => initValue.value?.policy?.ui?.dialog?.scrollLock ?? true
);

useConsentScrollLock(computed(() => Boolean(isOpen.value && scrollLock.value)));

const shouldTrapFocus = computed(() =>
	Boolean(isOpen.value && (toValue(config).trapFocus ?? true))
);
const card = ref<HTMLElement | null>(null);
useFocusTrap(card, () => shouldTrapFocus.value);
</script>

<template>
	<ConsentDialogTrigger v-if="config.iabDialogShowTrigger" />
	<Teleport to="body">
		<Transition
			:disabled="disableAnimation"
			:enter-from-class="dialogStyles.overlayHidden"
			:enter-active-class="dialogStyles.overlayVisible"
			:enter-to-class="dialogStyles.overlayVisible"
			:leave-from-class="dialogStyles.overlayVisible"
			:leave-active-class="dialogStyles.overlayHidden"
			:leave-to-class="dialogStyles.overlayHidden"
		>
			<div
				v-if="showDialog && scrollLock"
				v-bind="config.components?.['iab-dialog']?.overlay"
				data-testid="iab-consent-dialog-overlay"
				:class="dialogStyles.overlay"
			/>
		</Transition>
		<Transition
			:disabled="disableAnimation"
			:enter-from-class="dialogStyles.dialogHidden"
			:enter-active-class="dialogStyles.dialogVisible"
			:enter-to-class="dialogStyles.dialogVisible"
			:leave-from-class="dialogStyles.dialogVisible"
			:leave-active-class="dialogStyles.dialogHidden"
			:leave-to-class="dialogStyles.dialogHidden"
		>
			<div
				v-if="showDialog"
				v-bind="config.components?.['iab-dialog']?.root"
				data-testid="iab-consent-dialog-root"
				:class="dialogStyles.root"
			>
				<Transition
					:disabled="disableAnimation"
					:enter-from-class="dialogStyles.contentHidden"
					:enter-active-class="dialogStyles.contentVisible"
					:enter-to-class="dialogStyles.contentVisible"
					:leave-from-class="dialogStyles.contentVisible"
					:leave-active-class="dialogStyles.contentHidden"
					:leave-to-class="dialogStyles.contentHidden"
				>
					<div
						v-if="showDialog"
						ref="card"
						v-bind="config.components?.['iab-dialog']?.card"
						data-testid="iab-consent-dialog-card"
						:class="dialogStyles.card"
						:role="shouldTrapFocus ? 'dialog' : undefined"
						:aria-modal="shouldTrapFocus ? 'true' : undefined"
						:aria-label="iabT?.preferenceCenter?.title"
						tabindex="-1"
						@keydown="onDialogKeydown"
					>
						<div
							v-bind="config.components?.['iab-dialog']?.header"
							:class="dialogStyles.header"
						>
							<div
								v-bind="config.components?.['iab-dialog']?.headerContent"
								:class="dialogStyles.headerContent"
							>
								<h2
									v-bind="config.components?.['iab-dialog']?.title"
									:class="dialogStyles.title"
								>
									{{ iabT?.preferenceCenter?.title }}
								</h2>
								<p
									v-bind="config.components?.['iab-dialog']?.description"
									:class="dialogStyles.description"
								>
									{{ iabT?.preferenceCenter?.description }}
								</p>
							</div>
							<button
								v-bind="config.components?.['iab-dialog']?.closeButton"
								type="button"
								:class="dialogStyles.closeButton"
								:aria-label="iabT?.common?.close"
								data-testid="iab-consent-dialog-close"
								@click="closeDialog"
							>
								<svg
									aria-hidden="true"
									style="width: 1rem; height: 1rem"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<line
										x1="18"
										y1="6"
										x2="6"
										y2="18"
									/>
									<line
										x1="6"
										y1="6"
										x2="18"
										y2="18"
									/>
								</svg>
							</button>
						</div>

						<div
							v-bind="config.components?.['iab-dialog']?.body"
							:class="dialogStyles.body"
						>
							<div
								v-bind="config.components?.['iab-dialog']?.tabs"
								:class="dialogStyles.tabsContainer"
							>
								<div
									v-bind="config.components?.['iab-dialog']?.tabsList"
									:class="dialogStyles.tabsList"
									role="tablist"
								>
									<button
										v-bind="config.components?.['iab-dialog']?.tabTrigger"
										type="button"
										:class="dialogStyles.tabButton"
										role="tab"
										:aria-selected="activeTab === 'purposes'"
										:data-state="
											activeTab === 'purposes' ? 'active' : 'inactive'
										"
										@click="handleTabChange('purposes')"
									>
										{{ iabT?.preferenceCenter?.tabs?.purposes }}
										<span v-if="!isLoading"> ({{ purposeTabCount }})</span>
									</button>
									<button
										v-bind="config.components?.['iab-dialog']?.tabTrigger"
										type="button"
										:class="dialogStyles.tabButton"
										role="tab"
										:aria-selected="activeTab === 'vendors'"
										:data-state="
											activeTab === 'vendors' ? 'active' : 'inactive'
										"
										@click="handleTabChange('vendors')"
									>
										{{ iabT?.preferenceCenter?.tabs?.vendors }}
										<span v-if="!isLoading"> ({{ totalVendors }})</span>
									</button>
									<div
										v-bind="config.components?.['iab-dialog']?.tabIndicator"
										aria-hidden="true"
										:class="dialogStyles.tabIndicator"
										:data-active-tab="activeTab"
									/>
								</div>
							</div>

							<div
								v-bind="config.components?.['iab-dialog']?.content"
								:class="dialogStyles.content"
							>
								<div
									v-if="isLoading"
									v-bind="config.components?.['iab-dialog']?.loading"
									:class="dialogStyles.loadingContainer"
								>
									<div :class="dialogStyles.loadingSpinner" />
									<p :class="dialogStyles.loadingText">
										{{ iabT?.common?.loading }}
									</p>
								</div>
								<template v-else>
									<div
										v-show="activeTab === 'purposes'"
										v-bind="config.components?.['iab-dialog']?.tabPanel"
										:class="dialogStyles.tabPanel"
										role="tabpanel"
									>
										<template
											v-for="row in display.consentRows"
											:key="row.testId"
										>
											<IabStackItem
												v-if="isStackRow(row)"
												:stack="row"
												:consents="draftIab.purposeConsents"
												:vendor-consents="draftIab.vendorConsents"
												:vendor-legitimate-interests="
													draftIab.vendorLegitimateInterests
												"
												:purpose-legitimate-interests="
													draftIab.purposeLegitimateInterests
												"
												@toggle="
													(purposeId, value) =>
														setPurposeConsent(purposeId, value)
												"
												@vendor-toggle="
													(vendorId, value) => setVendorConsent(vendorId, value)
												"
												@vendor-click="handleVendorClick"
												@purpose-legitimate-interest-toggle="
													(purposeId, value) =>
														setPurposeLegitimateInterest(purposeId, value)
												"
											/>
											<IabPurposeItem
												v-else-if="row.toggle === 'special-feature'"
												:purpose="row"
												:test-id="row.testId"
												:is-enabled="
													draftIab.specialFeatureOptIns[row.id] ?? false
												"
												:vendor-consents="draftIab.vendorConsents"
												:vendor-legitimate-interests="
													draftIab.vendorLegitimateInterests
												"
												@toggle="
													(value) => setSpecialFeatureOptIn(row.id, value)
												"
												@vendor-toggle="
													(vendorId, value) => setVendorConsent(vendorId, value)
												"
												@vendor-click="handleVendorClick"
											/>
											<IabPurposeItem
												v-else
												:purpose="row"
												:test-id="row.testId"
												:is-enabled="draftIab.purposeConsents[row.id] ?? false"
												:vendor-consents="draftIab.vendorConsents"
												:vendor-legitimate-interests="
													draftIab.vendorLegitimateInterests
												"
												:purpose-legitimate-interests="
													draftIab.purposeLegitimateInterests
												"
												@toggle="(value) => setPurposeConsent(row.id, value)"
												@vendor-toggle="
													(vendorId, value) => setVendorConsent(vendorId, value)
												"
												@vendor-click="handleVendorClick"
												@purpose-legitimate-interest-toggle="
													(value) => setPurposeLegitimateInterest(row.id, value)
												"
											/>
										</template>
										<div
											v-if="display.essentialRows.length > 0"
											v-bind="
												config.components?.['iab-dialog']?.specialPurposes
											"
											:class="dialogStyles.specialPurposesSection"
										>
											<div :class="dialogStyles.specialPurposesHeader">
												<button
													type="button"
													:class="dialogStyles.purposeTrigger"
													:aria-expanded="specialPurposesExpanded"
													@click="
														specialPurposesExpanded = !specialPurposesExpanded
													"
												>
													<svg
														aria-hidden="true"
														:class="dialogStyles.purposeArrow"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
													>
														<path
															v-if="specialPurposesExpanded"
															d="M19 9l-7 7-7-7"
														/>
														<path
															v-else
															d="M9 5l7 7-7 7"
														/>
													</svg>
													<div :class="dialogStyles.purposeInfo">
														<h3 :class="dialogStyles.specialPurposesTitle">
															{{
																iabT?.preferenceCenter?.specialPurposes?.title
															}}
															<svg
																aria-hidden="true"
																:class="dialogStyles.lockIcon"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																stroke-width="2"
															>
																<rect
																	x="3"
																	y="11"
																	width="18"
																	height="11"
																	rx="2"
																	ry="2"
																/>
																<path d="M7 11V7a5 5 0 0 1 10 0v4" />
															</svg>
														</h3>
														<p :class="dialogStyles.purposeMeta">
															{{ essentialPartnerCount }}
															{{
																essentialPartnerCount === 1
																	? iabT?.preferenceCenter?.vendorList
																			?.partnerSingular
																	: iabT?.preferenceCenter?.vendorList
																			?.partnerPlural
															}}
														</p>
													</div>
												</button>
												<svg
													aria-hidden="true"
													:class="dialogStyles.infoIcon"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
												>
													<circle
														cx="12"
														cy="12"
														r="10"
													/>
													<line
														x1="12"
														y1="16"
														x2="12"
														y2="12"
													/>
													<line
														x1="12"
														y1="8"
														x2="12.01"
														y2="8"
													/>
												</svg>
											</div>

											<div
												v-if="specialPurposesExpanded"
												style="padding: 0.75rem"
											>
												<IabPurposeItem
													v-for="row in display.essentialRows"
													:key="row.testId"
													:purpose="row"
													:test-id="row.testId"
													:is-enabled="true"
													is-locked
													:vendor-consents="draftIab.vendorConsents"
													@vendor-toggle="
														(vendorId, value) =>
															setVendorConsent(vendorId, value)
													"
													@vendor-click="handleVendorClick"
												/>
											</div>
										</div>

										<div
											v-bind="config.components?.['iab-dialog']?.consentNotice"
											:class="dialogStyles.consentNotice"
										>
											<p :class="dialogStyles.consentNoticeText">
												{{ iabT?.preferenceCenter?.footer?.consentStorage }}
											</p>
										</div>
									</div>

									<div
										v-show="activeTab === 'vendors'"
										v-bind="config.components?.['iab-dialog']?.tabPanel"
										:class="dialogStyles.tabPanel"
										role="tabpanel"
									>
										<IabVendorList
											:vendor-data="gvl"
											:purposes="display.data.purposes"
											:vendor-consents="draftIab.vendorConsents"
											:selected-vendor-id="selectedVendorId"
											:custom-vendors="customVendors"
											:vendor-legitimate-interests="
												draftIab.vendorLegitimateInterests
											"
											@vendor-toggle="
												(vendorId, value) => setVendorConsent(vendorId, value)
											"
											@clear-selection="selectedVendorId = null"
										/>
									</div>
								</template>
							</div>
						</div>

						<div
							v-bind="config.components?.['iab-dialog']?.footer"
							:class="dialogStyles.footer"
						>
							<ConsentActions
								:layout="IAB_DIALOG_LAYOUT"
								:primary-actions="['customize']"
								:labels="labels"
								secondary-mode="stroke"
								:disabled="isLoading"
								:root-attrs="
									config.components?.['iab-dialog']?.actions as
										object | undefined
								"
								:group-attrs="
									config.components?.['iab-dialog']?.actionGroup as
										object | undefined
								"
								@action="onAction"
							/>
						</div>

						<ConsentTag
							v-if="!config.iabDialogHideBranding"
							context="iab-dialog"
						/>
					</div>
				</Transition>
			</div>
		</Transition>
	</Teleport>
</template>
