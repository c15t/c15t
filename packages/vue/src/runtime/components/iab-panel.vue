<script setup lang="ts">
import type { PresentationAction } from '@c15t/core';
import {
	applyPublisherRestrictionsToGVL,
	resolveIABBannerSummary,
	resolveIABDialogDisplayModel,
} from '@c15t/iab/headless';
import type {
	HeadlessIABDisplayRow,
	HeadlessIABDisplayStackRow,
} from '@c15t/iab/headless';
import { isDialogDismissKey } from '@c15t/ui/primitives/dialog';
import dialogStyles from '@c15t/ui/styles/components/iab-consent-dialog';

import '@c15t/ui/styles/components/iab-consent-dialog.css';
import { getTextDirection } from '@c15t/ui/utils';
import { computed, ref, Teleport, Transition, toValue, watch } from 'vue';

import {
	useConsentActiveUI,
	useConsentConfig,
	useConsentIabSave,
	useConsentIabSelection,
	useConsentInit,
	useIabTranslations,
} from '#c15t/composables';

import {
	useConsentKernel,
	useConsentKernelContext,
	useConsentSnapshot,
	useHasConsentUi,
} from '../composables/kernel';
import { useConsentPolicyActions } from '../composables/use-consent-policy-actions';
import { useConsentScrollLock } from '../composables/use-consent-scroll-lock';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '../primitives';
import { useFocusTrap } from '../primitives/use-focus-trap';
import { saveIABChoice } from '../utils/save-iab-choice';
import { slotAttrs } from '../utils/slot-attrs';
import ConsentActions from './actions.vue';
import IabFeatureItem from './iab-feature-item.vue';
import type { IabVendorId } from './iab-purpose-item.vue';
import IabPurposeItem from './iab-purpose-item.vue';
import IabStackItem from './iab-stack-item.vue';
import IabVendorList from './iab-vendor-list.vue';
import ConsentDialogTrigger from './panel-trigger.vue';
import ConsentTag from './tag.vue';

const IAB_DIALOG_LAYOUT: (PresentationAction | PresentationAction[])[] = [
	['reject', 'accept'],
	'save',
];

/**
 * The React and Svelte IAB dialog footers carry `data-action` and no
 * test-id, so an empty map keeps Vue's buttons on the same contract —
 * `ConsentActions` only falls back to its own ids when a surface names
 * none at all.
 */
const IAB_DIALOG_ACTION_TEST_IDS: Partial<Record<PresentationAction, string>> =
	{};

const activeUI = useConsentActiveUI();
const config = useConsentConfig();
const init = useConsentInit();
const snapshot = useConsentSnapshot();
const iabSelection = useConsentIabSelection();
const kernel = useConsentKernel();
const saveIab = useConsentIabSave();
// The dialog closes in the click task; see `saveIABChoice`.
const save = (...args: Parameters<typeof saveIab>) =>
	saveIABChoice(kernel, () => saveIab(...args));

const initValue = computed(() => toValue(init));
const textDirection = computed(() =>
	getTextDirection(initValue.value?.translations?.language)
);

// "Close" is core copy, not IAB copy — reading it off `iab.common` left the
// button with no accessible name.
const coreCommon = computed(
	() =>
		(
			initValue.value?.translations?.translations as
				| { common?: { close?: string } }
				| undefined
		)?.common
);
const gvl = computed(() => initValue.value?.gvl ?? null);
const customVendors = computed(() => initValue.value?.customVendors ?? []);
const kernelContext = useConsentKernelContext();

const hasConsentUi = useHasConsentUi();
const isOpen = computed(() => {
	if (!hasConsentUi.value) {
		return false;
	}
	const models = config.value.iabDialogModels;
	const { model } = snapshot.value.policyRule;
	const matchesModel =
		!models?.length ||
		(model !== undefined && model !== 'none' && models.includes(model));
	return (
		activeUI.value === 'manager' &&
		snapshot.value.policyRule.model === 'iab' &&
		Boolean(gvl.value || initValue.value?.gvlReference) &&
		matchesModel
	);
});

const showDialog = isOpen;

const props = withDefaults(
	defineProps<{
		/**
		 * Which tab the preference centre opens on. Lets a "N partners"
		 * link land on the vendor list instead of purposes.
		 */
		initialTab?: 'purposes' | 'vendors';
		/** Skip the enter and exit animations. Defaults to the config's. */
		disableAnimation?: boolean;
	}>(),
	{ disableAnimation: undefined, initialTab: undefined }
);

const disableAnimation = computed(() =>
	Boolean(props.disableAnimation ?? toValue(config).disableAnimation)
);

const activeTab = ref<'purposes' | 'vendors'>(props.initialTab ?? 'purposes');
const selectedVendorId = ref<IabVendorId | null>(null);
const specialPurposesExpanded = ref(false);

const iabT = useIabTranslations();

const labels = computed(() => ({
	accept: iabT.value?.common?.acceptAll ?? 'Accept all',
	reject: iabT.value?.common?.rejectAll ?? 'Reject all',
	save: iabT.value?.common?.saveSettings ?? 'Save settings',
}));

// Which rows this surface renders, and in what order, comes from the
// shared display model in `@c15t/iab/headless` — the same one React,
// Svelte and the Astro server render read.
const publisherRestrictions = computed(
	() => snapshot.value.iab?.publisherRestrictions
);
const display = computed(() =>
	resolveIABDialogDisplayModel(
		gvl.value
			? {
					customVendors: customVendors.value,
					gvl: gvl.value,
					publisherRestrictions: publisherRestrictions.value,
				}
			: null
	)
);
// The vendor tab reads declarations directly, so give it the ones
// publisher restrictions leave.
const vendorData = computed(() =>
	gvl.value
		? applyPublisherRestrictionsToGVL(gvl.value, publisherRestrictions.value)
		: null
);

const isStackRow = function isStackRow(
	row: HeadlessIABDisplayRow | HeadlessIABDisplayStackRow
): row is HeadlessIABDisplayStackRow {
	return row.kind === 'stack';
};

const isLoading = computed(() => !gvl.value);
const bannerSummary = computed(() =>
	resolveIABBannerSummary({
		customVendors: customVendors.value,
		gvl: gvl.value,
		gvlReference: initValue.value?.gvlReference,
	})
);

// The footer *is* the action root, the way it is in React.
const footerAttrs = computed(() => ({
	...((config.value.components?.['iab-dialog']?.footer as object | undefined) ??
		{}),
	...((config.value.components?.['iab-dialog']?.actions as
		| object
		| undefined) ?? {}),
}));

const totalVendors = computed(() => display.value.vendorTabCount);

const purposeTabCount = computed(() => display.value.purposeTabCount);

const essentialPartnerCount = computed(
	() => display.value.essentialPartnerCount
);

/**
 * Each switch writes the CMP handle's selection at once, as React and
 * Svelte do. The handle's selection is the IAB draft: it stays in kernel
 * state until a save encodes it, and the handle keeps unsaved selections
 * when another tab's receipt reloads. Without a handle the selection is
 * written to the kernel directly.
 */
const select = function select(
	apply: (handle: NonNullable<typeof kernelContext.iab>) => void,
	field: Exclude<keyof typeof iabSelection.value, 'preferenceCenterTab'>,
	id: number | string,
	value: boolean
) {
	const handle = kernelContext.iab;
	if (handle) {
		apply(handle);
		return;
	}
	iabSelection.value = {
		...iabSelection.value,
		[field]: { ...iabSelection.value[field], [String(id)]: value },
	};
};

const setPurposeConsent = function setPurposeConsent(
	purposeId: number,
	value: boolean
) {
	select(
		(handle) => handle.setPurposeConsent(purposeId, value),
		'purposeConsents',
		purposeId,
		value
	);
};

const setPurposeLegitimateInterest = function setPurposeLegitimateInterest(
	purposeId: number,
	value: boolean
) {
	select(
		(handle) => handle.setPurposeLegitimateInterest(purposeId, value),
		'purposeLegitimateInterests',
		purposeId,
		value
	);
};

const setVendorConsent = function setVendorConsent(
	vendorId: IabVendorId,
	value: boolean
) {
	select(
		(handle) => handle.setVendorConsent(vendorId, value),
		'vendorConsents',
		vendorId,
		value
	);
};

const setVendorLegitimateInterest = function setVendorLegitimateInterest(
	vendorId: IabVendorId,
	value: boolean
) {
	select(
		(handle) => handle.setVendorLegitimateInterest(vendorId, value),
		'vendorLegitimateInterests',
		vendorId,
		value
	);
};

const setSpecialFeatureOptIn = function setSpecialFeatureOptIn(
	featureId: number,
	value: boolean
) {
	select(
		(handle) => handle.setSpecialFeatureOptIn(featureId, value),
		'specialFeatureOptIns',
		featureId,
		value
	);
};

watch(
	isOpen,
	(open) => {
		if (!open) {
			return;
		}

		// A caller-supplied tab outranks the remembered one, so a "N
		// partners" deep link lands on the vendor list.
		activeTab.value =
			props.initialTab ?? iabSelection.value.preferenceCenterTab;
	},
	{ immediate: true }
);

watch(
	() => iabSelection.value.preferenceCenterTab,
	(tab) => {
		if (isOpen.value) {
			activeTab.value = tab;
		}
	}
);

// The tabs primitive owns `activeTab`; this mirrors it back into the
// shared selection so a reopened dialog lands where the visitor left it.
watch(activeTab, (tab) => {
	iabSelection.value.preferenceCenterTab = tab;
});

const closeDialog = function closeDialog() {
	activeUI.value = null;
};

const onDialogKeydown = function onDialogKeydown(event: KeyboardEvent) {
	if (isDialogDismissKey(event.key)) {
		event.preventDefault();
		closeDialog();
	}
};

const onAction = async function onAction(action: PresentationAction) {
	try {
		if (action === 'save') {
			// The switches already wrote the selection; this encodes it.
			await save(
				{ ...iabSelection.value, preferenceCenterTab: activeTab.value },
				activeTab.value
			);
			return;
		}
		if (action === 'accept') {
			await save('all', activeTab.value);
			return;
		}
		if (action === 'reject') {
			await save('none', activeTab.value);
		}
	} catch {
		// Leave the prompt available so a failed vendor-list load can be retried.
	}
};

const handleVendorClick = function handleVendorClick(vendorId: IabVendorId) {
	selectedVendorId.value = vendorId;
	activeTab.value = 'vendors';
};

const { presentation } = useConsentPolicyActions('preferences', {
	layout: IAB_DIALOG_LAYOUT,
});
const scrollLock = computed(() => presentation.value.scrollLock);

useConsentScrollLock(computed(() => Boolean(isOpen.value && scrollLock.value)));

const shouldTrapFocus = computed(() =>
	Boolean(isOpen.value && presentation.value.blocking)
);
const card = ref<HTMLElement | null>(null);
useFocusTrap(card, () => shouldTrapFocus.value, {
	initialFocus: 'first-tabbable',
});
</script>

<template>
	<ConsentDialogTrigger v-if="config.iabDialogShowTrigger" />
	<Teleport to="body">
		<Transition
			:css="!disableAnimation"
			:enter-from-class="dialogStyles.overlayHidden"
			:enter-active-class="dialogStyles.overlayVisible"
			:enter-to-class="dialogStyles.overlayVisible"
			:leave-from-class="dialogStyles.overlayVisible"
			:leave-active-class="dialogStyles.overlayHidden"
			:leave-to-class="dialogStyles.overlayHidden"
		>
			<div
				v-if="showDialog && scrollLock"
				v-bind="
					slotAttrs(config.components?.['iab-dialog']?.overlay, [
						dialogStyles.overlay,
						dialogStyles.overlayVisible,
					])
				"
				aria-hidden="true"
				data-testid="iab-consent-dialog-overlay"
			/>
		</Transition>
		<Transition
			:css="!disableAnimation"
			:enter-from-class="dialogStyles.dialogHidden"
			:enter-active-class="dialogStyles.dialogVisible"
			:enter-to-class="dialogStyles.dialogVisible"
			:leave-from-class="dialogStyles.dialogVisible"
			:leave-active-class="dialogStyles.dialogHidden"
			:leave-to-class="dialogStyles.dialogHidden"
		>
			<div
				v-if="showDialog"
				v-bind="
					slotAttrs(config.components?.['iab-dialog']?.root, [
						dialogStyles.root,
						dialogStyles.dialogVisible,
					])
				"
				data-testid="iab-consent-dialog-root"
				:dir="textDirection"
			>
				<Transition
					:css="!disableAnimation"
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
						v-bind="
							slotAttrs(config.components?.['iab-dialog']?.card, [
								dialogStyles.card,
								dialogStyles.contentVisible,
							])
						"
						data-testid="iab-consent-dialog-card"
						role="dialog"
						:aria-modal="shouldTrapFocus ? 'true' : undefined"
						:aria-label="iabT?.preferenceCenter?.title"
						aria-describedby="iab-consent-dialog-description"
						tabindex="-1"
						@keydown="onDialogKeydown"
					>
						<div
							v-bind="
								slotAttrs(
									config.components?.['iab-dialog']?.header,
									dialogStyles.header
								)
							"
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
									id="iab-consent-dialog-description"
								>
									{{ iabT?.preferenceCenter?.description }}
								</p>
							</div>
							<button
								v-bind="config.components?.['iab-dialog']?.closeButton"
								type="button"
								:class="dialogStyles.closeButton"
								:aria-label="coreCommon?.close"
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

						<TabsRoot
							v-model:value="activeTab"
							v-bind="config.components?.['iab-dialog']?.body"
							:class="dialogStyles.body"
						>
							<div
								v-bind="config.components?.['iab-dialog']?.tabs"
								:class="dialogStyles.tabsContainer"
							>
								<TabsList
									v-bind="config.components?.['iab-dialog']?.tabsList"
									:class="dialogStyles.tabsList"
								>
									<TabsTrigger
										v-bind="config.components?.['iab-dialog']?.tabTrigger"
										:class="dialogStyles.tabButton"
										value="purposes"
									>
										{{ iabT?.preferenceCenter?.tabs?.purposes }}
										<template v-if="!isLoading">
											{{ ` (${purposeTabCount})` }}
										</template>
									</TabsTrigger>
									<TabsTrigger
										v-bind="config.components?.['iab-dialog']?.tabTrigger"
										:class="dialogStyles.tabButton"
										value="vendors"
									>
										{{ iabT?.preferenceCenter?.tabs?.vendors }}
										<template v-if="!isLoading">
											{{ ` (${totalVendors})` }}
										</template>
									</TabsTrigger>
									<div
										v-bind="config.components?.['iab-dialog']?.tabIndicator"
										aria-hidden="true"
										:class="dialogStyles.tabIndicator"
										:data-active-tab="activeTab"
									/>
								</TabsList>
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
									<TabsContent
										v-bind="config.components?.['iab-dialog']?.tabPanel"
										:class="dialogStyles.tabPanel"
										force-mount
										value="purposes"
									>
										<template
											v-for="row in display.consentRows"
											:key="row.testId"
										>
											<IabStackItem
												v-if="isStackRow(row)"
												:stack="row"
												:consents="iabSelection.purposeConsents"
												:vendor-consents="iabSelection.vendorConsents"
												:vendor-legitimate-interests="
													iabSelection.vendorLegitimateInterests
												"
												:purpose-legitimate-interests="
													iabSelection.purposeLegitimateInterests
												"
												@toggle="
													(purposeId, value) =>
														setPurposeConsent(purposeId, value)
												"
												@vendor-toggle="
													(vendorId, value) => setVendorConsent(vendorId, value)
												"
												@vendor-click="handleVendorClick"
												@vendor-legitimate-interest-toggle="
													(vendorId, value) =>
														setVendorLegitimateInterest(vendorId, value)
												"
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
													iabSelection.specialFeatureOptIns[row.id] ?? false
												"
												:vendor-consents="iabSelection.vendorConsents"
												:vendor-legitimate-interests="
													iabSelection.vendorLegitimateInterests
												"
												@toggle="
													(value) => setSpecialFeatureOptIn(row.id, value)
												"
												@vendor-toggle="
													(vendorId, value) => setVendorConsent(vendorId, value)
												"
												@vendor-click="handleVendorClick"
												@vendor-legitimate-interest-toggle="
													(vendorId, value) =>
														setVendorLegitimateInterest(vendorId, value)
												"
											/>
											<IabPurposeItem
												v-else
												:purpose="row"
												:test-id="row.testId"
												:is-enabled="
													iabSelection.purposeConsents[row.id] ?? false
												"
												:vendor-consents="iabSelection.vendorConsents"
												:vendor-legitimate-interests="
													iabSelection.vendorLegitimateInterests
												"
												:purpose-legitimate-interests="
													iabSelection.purposeLegitimateInterests
												"
												@toggle="(value) => setPurposeConsent(row.id, value)"
												@vendor-toggle="
													(vendorId, value) => setVendorConsent(vendorId, value)
												"
												@vendor-click="handleVendorClick"
												@vendor-legitimate-interest-toggle="
													(vendorId, value) =>
														setVendorLegitimateInterest(vendorId, value)
												"
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
													:aria-expanded="specialPurposesExpanded"
													:class="dialogStyles.purposeTrigger"
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
												<div style="position: relative">
													<svg
														:aria-label="
															iabT?.preferenceCenter?.specialPurposes?.tooltip
														"
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
													:vendor-consents="iabSelection.vendorConsents"
													@vendor-toggle="
														(vendorId, value) =>
															setVendorConsent(vendorId, value)
													"
													@vendor-click="handleVendorClick"
													@vendor-legitimate-interest-toggle="
														(vendorId, value) =>
															setVendorLegitimateInterest(vendorId, value)
													"
												/>
											</div>
										</div>

										<!-- Features: informational, no controls (TCF Policies v5.0.b) -->
										<section
											v-if="display.featureRows.length > 0"
											:aria-label="iabT?.preferenceCenter?.features?.title"
											:class="dialogStyles.featuresSection"
											data-testid="iab-consent-dialog-features"
										>
											<div :class="dialogStyles.featuresHeader">
												<h3 :class="dialogStyles.featuresTitle">
													{{ iabT?.preferenceCenter?.features?.title }}
												</h3>
												<p :class="dialogStyles.featuresDescription">
													{{
														display.featuresStandardText ??
														iabT?.preferenceCenter?.features?.description
													}}
												</p>
											</div>
											<div :class="dialogStyles.featuresList">
												<IabFeatureItem
													v-for="row in display.featureRows"
													:key="row.testId"
													:feature="row"
													:test-id="row.testId"
												/>
											</div>
										</section>

										<div
											v-bind="config.components?.['iab-dialog']?.consentNotice"
											:class="dialogStyles.consentNotice"
										>
											<p :class="dialogStyles.consentNoticeText">
												{{ iabT?.preferenceCenter?.footer?.consentStorage }}
											</p>
										</div>
									</TabsContent>

									<TabsContent
										v-bind="config.components?.['iab-dialog']?.tabPanel"
										:class="dialogStyles.tabPanel"
										force-mount
										value="vendors"
									>
										<IabVendorList
											:vendor-data="vendorData"
											:purposes="display.data.purposes"
											:vendor-consents="iabSelection.vendorConsents"
											:selected-vendor-id="selectedVendorId"
											:custom-vendors="customVendors"
											:vendor-legitimate-interests="
												iabSelection.vendorLegitimateInterests
											"
											@vendor-toggle="
												(vendorId, value) => setVendorConsent(vendorId, value)
											"
											@vendor-legitimate-interest-toggle="
												(vendorId, value) =>
													setVendorLegitimateInterest(vendorId, value)
											"
											@clear-selection="selectedVendorId = null"
										/>
									</TabsContent>
								</template>
							</div>
						</TabsRoot>

						<ConsentActions
							:action-groups="presentation.actionGroups"
							:direction="presentation.direction"
							:primary-actions="presentation.primaryActions"
							:labels="labels"
							:test-ids="IAB_DIALOG_ACTION_TEST_IDS"
							primary-mode="filled"
							secondary-mode="stroke"
							:disabled="!bannerSummary.isReady"
							:disabled-actions="isLoading ? ['save'] : []"
							:root-test-id="null"
							:root-class="dialogStyles.footer"
							:root-attrs="footerAttrs"
							:group-attrs="
								config.components?.['iab-dialog']?.actionGroup as
									object | undefined
							"
							@action="onAction"
						/>

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
