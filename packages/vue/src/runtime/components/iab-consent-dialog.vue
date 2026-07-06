<script
	setup
	lang="ts"
>
import type {
	GlobalVendorList,
	NonIABVendor,
	PolicyUiAction,
} from '@c15t/schema/types';
import dialogStyles from '@c15t/ui/styles/v3/iab-consent-dialog';
import { computed, ref, Teleport, Transition, toValue, watch } from 'vue';
import {
	type ConsentIabSelection,
	createDefaultIabSelection,
	useConsentActiveUI,
	useConsentConfig,
	useConsentIabSave,
	useConsentIabSelection,
	useConsentInit,
} from '#c15t/composables';
import { useConsentScrollLock } from '../composables/use-consent-scroll-lock';
import { FocusScope } from '../primitives';
import ConsentActions from './consent-actions.vue';
import ConsentDialogTrigger from './consent-dialog-trigger.vue';
import ConsentTag from './consent-tag.vue';
import type {
	IabProcessedPurpose,
	IabProcessedVendor,
	IabVendorId,
} from './iab-purpose-item.vue';
import IabPurposeItem from './iab-purpose-item.vue';
import type { IabProcessedStack } from './iab-stack-item.vue';
import IabStackItem from './iab-stack-item.vue';
import IabVendorList from './iab-vendor-list.vue';

const STANDALONE_PURPOSE_ID = 1;
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
						footer?: { consentStorage?: string };
					};
			  }
			| undefined
);

const labels = computed(() => ({
	accept: iabT.value?.common?.acceptAll ?? 'Accept all',
	reject: iabT.value?.common?.rejectAll ?? 'Reject all',
	customize: iabT.value?.common?.saveSettings ?? 'Save settings',
}));

function mapVendor(
	_gvl: GlobalVendorList,
	vendorId: string,
	vendor: GlobalVendorList['vendors'][string],
	purposeId?: number
): IabProcessedVendor {
	return {
		id: Number(vendorId),
		name: vendor.name,
		usesLegitimateInterest: purposeId
			? (vendor.legIntPurposes?.includes(purposeId) ?? false)
			: false,
		isCustom: false,
	};
}

function mapCustomVendor(
	vendor: NonIABVendor,
	purposeId?: number
): IabProcessedVendor {
	return {
		id: vendor.id,
		name: vendor.name,
		usesLegitimateInterest: purposeId
			? (vendor.legIntPurposes?.includes(purposeId) ?? false)
			: false,
		isCustom: true,
	};
}

function processGvlData(gvl: GlobalVendorList, customVendors: NonIABVendor[]) {
	const processedPurposes: IabProcessedPurpose[] = Object.entries(gvl.purposes)
		.map(([id, purpose]) => {
			const purposeId = Number(id);
			const iabVendors = Object.entries(gvl.vendors)
				.filter(
					([, vendor]) =>
						vendor.purposes?.includes(purposeId) ||
						vendor.legIntPurposes?.includes(purposeId)
				)
				.map(([vendorId, vendor]) =>
					mapVendor(gvl, vendorId, vendor, purposeId)
				);
			const customForPurpose = customVendors
				.filter(
					(vendor) =>
						vendor.purposes?.includes(purposeId) ||
						vendor.legIntPurposes?.includes(purposeId)
				)
				.map((vendor) => mapCustomVendor(vendor, purposeId));

			return {
				id: purposeId,
				name: purpose.name,
				description: purpose.description,
				illustrations: purpose.illustrations ?? [],
				vendors: [...iabVendors, ...customForPurpose],
			};
		})
		.filter((purpose) => purpose.vendors.length > 0);

	const specialPurposes: IabProcessedPurpose[] = Object.entries(
		gvl.specialPurposes ?? {}
	)
		.map(([id, purpose]) => ({
			id: Number(id),
			name: purpose.name,
			description: purpose.description,
			illustrations: purpose.illustrations ?? [],
			vendors: Object.entries(gvl.vendors)
				.filter(([, vendor]) => vendor.specialPurposes?.includes(Number(id)))
				.map(([vendorId, vendor]) => mapVendor(gvl, vendorId, vendor)),
		}))
		.filter((purpose) => purpose.vendors.length > 0);

	const specialFeatures: IabProcessedPurpose[] = Object.entries(
		gvl.specialFeatures ?? {}
	)
		.map(([id, feature]) => ({
			id: Number(id),
			name: feature.name,
			description: feature.description,
			illustrations: feature.illustrations ?? [],
			vendors: Object.entries(gvl.vendors)
				.filter(([, vendor]) => vendor.specialFeatures?.includes(Number(id)))
				.map(([vendorId, vendor]) => mapVendor(gvl, vendorId, vendor)),
		}))
		.filter((feature) => feature.vendors.length > 0);

	const features: IabProcessedPurpose[] = Object.entries(gvl.features ?? {})
		.map(([id, feature]) => ({
			id: Number(id),
			name: feature.name,
			description: feature.description,
			illustrations: feature.illustrations ?? [],
			vendors: Object.entries(gvl.vendors)
				.filter(([, vendor]) => vendor.features?.includes(Number(id)))
				.map(([vendorId, vendor]) => mapVendor(gvl, vendorId, vendor)),
		}))
		.filter((feature) => feature.vendors.length > 0);

	const standalonePurpose = processedPurposes.find(
		(purpose) => purpose.id === STANDALONE_PURPOSE_ID
	);
	const otherPurposes = processedPurposes.filter(
		(purpose) => purpose.id !== STANDALONE_PURPOSE_ID
	);
	const otherPurposeIds = new Set(otherPurposes.map((purpose) => purpose.id));

	const stackScores: Array<{
		stackId: number;
		stack: GlobalVendorList['stacks'][string];
		coveredPurposeIds: number[];
		score: number;
	}> = [];

	for (const [stackIdStr, stack] of Object.entries(gvl.stacks ?? {})) {
		const coveredIds = stack.purposes.filter((purposeId) =>
			otherPurposeIds.has(purposeId)
		);
		if (coveredIds.length >= 2) {
			stackScores.push({
				stackId: Number(stackIdStr),
				stack,
				coveredPurposeIds: coveredIds,
				score: coveredIds.length,
			});
		}
	}

	stackScores.sort((left, right) => right.score - left.score);

	const stacks: IabProcessedStack[] = [];
	const assignedPurposeIds = new Set<number>();

	for (const { stackId, stack, coveredPurposeIds } of stackScores) {
		const unassigned = coveredPurposeIds.filter(
			(purposeId) => !assignedPurposeIds.has(purposeId)
		);
		if (unassigned.length >= 2) {
			stacks.push({
				id: stackId,
				name: stack.name,
				description: stack.description,
				purposes: otherPurposes.filter((purpose) =>
					unassigned.includes(purpose.id)
				),
			});
			for (const purposeId of unassigned) {
				assignedPurposeIds.add(purposeId);
			}
		}
	}

	const uncoveredPurposes = otherPurposes.filter(
		(purpose) => !assignedPurposeIds.has(purpose.id)
	);
	const standalonePurposes = standalonePurpose
		? [standalonePurpose, ...uncoveredPurposes]
		: uncoveredPurposes;

	return {
		purposes: processedPurposes,
		specialPurposes,
		specialFeatures,
		features,
		stacks,
		standalonePurposes,
	};
}

const processed = computed(() => {
	if (!gvl.value) {
		return {
			purposes: [] as IabProcessedPurpose[],
			specialPurposes: [] as IabProcessedPurpose[],
			specialFeatures: [] as IabProcessedPurpose[],
			features: [] as IabProcessedPurpose[],
			stacks: [] as IabProcessedStack[],
			standalonePurposes: [] as IabProcessedPurpose[],
		};
	}

	return processGvlData(gvl.value, customVendors.value);
});

const isLoading = computed(() => !gvl.value);

const totalVendors = computed(() => {
	if (!gvl.value) {
		return 0;
	}

	return Object.keys(gvl.value.vendors).length + customVendors.value.length;
});

const purposeTabCount = computed(
	() =>
		processed.value.purposes.length +
		processed.value.specialPurposes.length +
		processed.value.specialFeatures.length +
		processed.value.features.length
);

const essentialPartnerCount = computed(
	() =>
		new Set([
			...processed.value.specialPurposes.flatMap((purpose) =>
				purpose.vendors.map((vendor) => vendor.id)
			),
			...processed.value.features.flatMap((feature) =>
				feature.vendors.map((vendor) => vendor.id)
			),
		]).size
);

function setPurposeConsent(purposeId: number, value: boolean) {
	draftIab.value.purposeConsents = {
		...draftIab.value.purposeConsents,
		[purposeId]: value,
	};
}

function setPurposeLegitimateInterest(purposeId: number, value: boolean) {
	draftIab.value.purposeLegitimateInterests = {
		...draftIab.value.purposeLegitimateInterests,
		[purposeId]: value,
	};
}

function setVendorConsent(vendorId: IabVendorId, value: boolean) {
	draftIab.value.vendorConsents = {
		...draftIab.value.vendorConsents,
		[String(vendorId)]: value,
	};
}

function setSpecialFeatureOptIn(featureId: number, value: boolean) {
	draftIab.value.specialFeatureOptIns = {
		...draftIab.value.specialFeatureOptIns,
		[featureId]: value,
	};
}

function syncDraftFromSelection() {
	draftIab.value = structuredClone(iabSelection.value);
}

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

function handleTabChange(tab: 'purposes' | 'vendors') {
	activeTab.value = tab;
	draftIab.value.preferenceCenterTab = tab;
	iabSelection.value.preferenceCenterTab = tab;
}

function closeDialog() {
	activeUI.value = null;
}

function onAction(action: PolicyUiAction) {
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
}

function handleVendorClick(vendorId: IabVendorId) {
	selectedVendorId.value = vendorId;
	handleTabChange('vendors');
}

const scrollLock = computed(
	() => initValue.value?.policy?.ui?.dialog?.scrollLock ?? true
);

useConsentScrollLock(computed(() => Boolean(isOpen.value && scrollLock.value)));

const shouldTrapFocus = computed(() =>
	Boolean(isOpen.value && (toValue(config).trapFocus ?? true))
);
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
				<FocusScope
					:trapped="shouldTrapFocus"
					:loop="shouldTrapFocus"
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
							v-bind="config.components?.['iab-dialog']?.card"
							data-testid="iab-consent-dialog-card"
							:class="dialogStyles.card"
							:role="shouldTrapFocus ? 'dialog' : undefined"
							:aria-modal="shouldTrapFocus ? 'true' : undefined"
							:aria-label="iabT?.preferenceCenter?.title"
							tabindex="0"
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
											:data-state="activeTab === 'purposes' ? 'active' : 'inactive'"
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
											:data-state="activeTab === 'vendors' ? 'active' : 'inactive'"
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
											<IabPurposeItem
												v-for="purpose in processed.standalonePurposes"
												:key="purpose.id"
												:purpose="purpose"
												:is-enabled="draftIab.purposeConsents[purpose.id] ?? false"
												:vendor-consents="draftIab.vendorConsents"
												:vendor-legitimate-interests="draftIab.vendorLegitimateInterests"
												:purpose-legitimate-interests="draftIab.purposeLegitimateInterests"
												@toggle="(value) => setPurposeConsent(purpose.id, value)"
												@vendor-toggle="
										(vendorId, value) => setVendorConsent(vendorId, value)
									"
												@vendor-click="handleVendorClick"
												@purpose-legitimate-interest-toggle="
										(value) =>
											setPurposeLegitimateInterest(purpose.id, value)
									"
											/>

											<IabStackItem
												v-for="stack in processed.stacks"
												:key="stack.id"
												:stack="stack"
												:consents="draftIab.purposeConsents"
												:vendor-consents="draftIab.vendorConsents"
												:vendor-legitimate-interests="draftIab.vendorLegitimateInterests"
												:purpose-legitimate-interests="draftIab.purposeLegitimateInterests"
												@toggle="
										(purposeId, value) => setPurposeConsent(purposeId, value)
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
												v-for="feature in processed.specialFeatures"
												:key="`feature-${feature.id}`"
												:purpose="feature"
												:is-enabled="draftIab.specialFeatureOptIns[feature.id] ?? false"
												:vendor-consents="draftIab.vendorConsents"
												:vendor-legitimate-interests="draftIab.vendorLegitimateInterests"
												@toggle="
										(value) => setSpecialFeatureOptIn(feature.id, value)
									"
												@vendor-toggle="
										(vendorId, value) => setVendorConsent(vendorId, value)
									"
												@vendor-click="handleVendorClick"
											/>

											<div
												v-if="
										processed.specialPurposes.length > 0 ||
										processed.features.length > 0
									"
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
																{{ iabT?.preferenceCenter?.specialPurposes?.title }}
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
																partners
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
														v-for="purpose in processed.specialPurposes"
														:key="`special-${purpose.id}`"
														:purpose="purpose"
														:is-enabled="true"
														is-locked
														:vendor-consents="draftIab.vendorConsents"
														@vendor-toggle="
												(vendorId, value) => setVendorConsent(vendorId, value)
											"
														@vendor-click="handleVendorClick"
													/>
													<IabPurposeItem
														v-for="feature in processed.features"
														:key="`locked-feature-${feature.id}`"
														:purpose="feature"
														:is-enabled="true"
														is-locked
														:vendor-consents="draftIab.vendorConsents"
														@vendor-toggle="
												(vendorId, value) => setVendorConsent(vendorId, value)
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
												:purposes="processed.purposes"
												:vendor-consents="draftIab.vendorConsents"
												:selected-vendor-id="selectedVendorId"
												:custom-vendors="customVendors"
												:vendor-legitimate-interests="draftIab.vendorLegitimateInterests"
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
									:root-attrs="config.components?.['iab-dialog']?.actions as
										object | undefined"
									:group-attrs="config.components?.['iab-dialog']?.actionGroup as
										object | undefined"
									@action="onAction"
								/>
							</div>

							<ConsentTag
								v-if="!config.iabDialogHideBranding"
								context="iab-dialog"
							/>
						</div>
					</Transition>
				</FocusScope>
			</div>
		</Transition>
	</Teleport>
</template>
