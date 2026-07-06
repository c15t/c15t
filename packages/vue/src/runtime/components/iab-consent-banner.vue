<script
	setup
	lang="ts"
>
import type {
	GlobalVendorList,
	NonIABVendor,
	PolicyUiAction,
} from '@c15t/schema/types';
import bannerStyles from '@c15t/ui/styles/v3/iab-consent-banner';
import { computed, Teleport, Transition, toValue } from 'vue';
import {
	useConsentActiveUI,
	useConsentConfig,
	useConsentIabSave,
	useConsentIabSelection,
	useConsentInit,
} from '#c15t/composables';
import { useConsentScrollLock } from '../composables/use-consent-scroll-lock';
import { FocusScope } from '../primitives';
import ConsentActions from './consent-actions.vue';
import ConsentTag from './consent-tag.vue';

const MAX_DISPLAY_ITEMS = 5;
const STANDALONE_PURPOSE_ID = 1;
const IAB_BANNER_LAYOUT: (PolicyUiAction | PolicyUiAction[])[] = [
	['reject', 'accept'],
	'customize',
];

const props = withDefaults(
	defineProps<{
		primaryButton?: 'reject' | 'accept' | 'customize';
	}>(),
	{
		primaryButton: 'customize',
	}
);

const activeUI = useConsentActiveUI();
const config = useConsentConfig();
const init = useConsentInit();
const iabSelection = useConsentIabSelection();
const save = useConsentIabSave();

const initValue = computed(() => toValue(init));
const gvl = computed(() => initValue.value?.gvl ?? null);
const customVendors = computed(() => initValue.value?.customVendors ?? []);

const isOpen = computed(() => {
	const models = config.value.iabBannerModels;
	const model = initValue.value?.policy?.model;
	const matchesModel =
		!models?.length || (model !== undefined && models.includes(model));
	return (
		activeUI.value === 'banner' &&
		initValue.value?.policy?.model === 'iab' &&
		Boolean(gvl.value) &&
		matchesModel
	);
});
const disableAnimation = computed(() =>
	Boolean(toValue(config).disableAnimation)
);

const showBanner = computed(
	() => isOpen.value && Boolean(gvl.value) && bannerSummary.value.isReady
);

const iabT = computed(() => {
	const translations = toValue(init)?.translations?.translations as
		| { iab?: Record<string, unknown> }
		| undefined;
	return translations?.iab as
		| {
				banner?: {
					title?: string;
					description?: string;
					partnersLink?: string;
					andMore?: string;
					legitimateInterestNotice?: string;
					scopeServiceSpecific?: string;
				};
				common?: {
					acceptAll?: string;
					rejectAll?: string;
					customize?: string;
				};
		  }
		| undefined;
});

const labels = computed(() => ({
	accept: iabT.value?.common?.acceptAll ?? 'Accept all',
	reject: iabT.value?.common?.rejectAll ?? 'Reject all',
	customize: iabT.value?.common?.customize ?? 'Customize',
}));

function resolveBannerSummary(
	gvlData: GlobalVendorList,
	vendors: NonIABVendor[]
) {
	const vendorCount = Object.keys(gvlData.vendors).length + vendors.length;

	const purposesWithVendors = Object.entries(gvlData.purposes)
		.filter(([id]) =>
			Object.values(gvlData.vendors).some(
				(vendor) =>
					vendor.purposes?.includes(Number(id)) ||
					vendor.legIntPurposes?.includes(Number(id))
			)
		)
		.map(([id, purpose]) => ({ id: Number(id), name: purpose.name }));

	const standalonePurpose = purposesWithVendors.find(
		(purpose) => purpose.id === STANDALONE_PURPOSE_ID
	);
	const otherPurposes = purposesWithVendors.filter(
		(purpose) => purpose.id !== STANDALONE_PURPOSE_ID
	);
	const otherPurposeIds = new Set(otherPurposes.map((purpose) => purpose.id));

	const stackScores: Array<{
		name: string;
		coveredPurposeIds: number[];
		score: number;
	}> = [];

	for (const stack of Object.values(gvlData.stacks || {})) {
		const coveredPurposeIds = stack.purposes.filter((purposeId) =>
			otherPurposeIds.has(purposeId)
		);
		if (coveredPurposeIds.length >= 2) {
			stackScores.push({
				name: stack.name,
				coveredPurposeIds,
				score: coveredPurposeIds.length,
			});
		}
	}

	stackScores.sort((left, right) => right.score - left.score);

	const selectedStacks: string[] = [];
	const assignedPurposeIds = new Set<number>();
	for (const { name, coveredPurposeIds } of stackScores) {
		const unassigned = coveredPurposeIds.filter(
			(purposeId) => !assignedPurposeIds.has(purposeId)
		);
		if (unassigned.length >= 2) {
			selectedStacks.push(name);
			for (const purposeId of unassigned) {
				assignedPurposeIds.add(purposeId);
			}
		}
	}

	const uncoveredPurposes = otherPurposes.filter(
		(purpose) => !assignedPurposeIds.has(purpose.id)
	);

	const specialFeatures = Object.entries(gvlData.specialFeatures || {})
		.filter(([id]) =>
			Object.values(gvlData.vendors).some((vendor) =>
				vendor.specialFeatures?.includes(Number(id))
			)
		)
		.map(([, feature]) => feature.name);

	const items: string[] = [];
	if (standalonePurpose) {
		items.push(standalonePurpose.name);
	}
	for (const stackName of selectedStacks) {
		items.push(stackName);
	}
	for (const purpose of uncoveredPurposes) {
		items.push(purpose.name);
	}
	for (const featureName of specialFeatures) {
		items.push(featureName);
	}

	return {
		vendorCount,
		displayItems: items.slice(0, MAX_DISPLAY_ITEMS),
		remainingCount: Math.max(0, items.length - MAX_DISPLAY_ITEMS),
		isReady: true,
	};
}

const bannerSummary = computed(() => {
	if (!gvl.value) {
		return {
			isReady: false,
			vendorCount: 0,
			displayItems: [] as string[],
			remainingCount: 0,
		};
	}

	return resolveBannerSummary(gvl.value, customVendors.value);
});

const descriptionText = computed(() =>
	(iabT.value?.banner?.description ?? '').replace(
		'{partnerCount}',
		String(bannerSummary.value.vendorCount)
	)
);

const partnersLinkText = computed(() =>
	(iabT.value?.banner?.partnersLink ?? '').replace(
		'{count}',
		String(bannerSummary.value.vendorCount)
	)
);

const descriptionParts = computed(() => {
	const text = descriptionText.value;
	const link = partnersLinkText.value;
	if (!link || !text.includes(link)) {
		return { before: text, after: '' };
	}

	const [before, after] = text.split(link);
	return { before: before ?? text, after: after ?? '' };
});

function onAction(action: PolicyUiAction) {
	if (action === 'customize') {
		iabSelection.value.preferenceCenterTab = 'purposes';
		activeUI.value = 'manager';
		return;
	}
	if (action === 'accept') {
		save('all');
		return;
	}
	if (action === 'reject') {
		save('none');
	}
}

function openVendors() {
	iabSelection.value.preferenceCenterTab = 'vendors';
	activeUI.value = 'manager';
}

const scrollLock = computed(
	() => initValue.value?.policy?.ui?.banner?.scrollLock ?? true
);

useConsentScrollLock(computed(() => Boolean(isOpen.value && scrollLock.value)));

const shouldTrapFocus = computed(() =>
	Boolean(isOpen.value && (toValue(config).trapFocus ?? true))
);
</script>

<template>
	<Teleport to="body">
		<Transition
			:disabled="disableAnimation"
			:enter-from-class="bannerStyles.overlayHidden"
			:enter-active-class="bannerStyles.overlayVisible"
			:enter-to-class="bannerStyles.overlayVisible"
			:leave-from-class="bannerStyles.overlayVisible"
			:leave-active-class="bannerStyles.overlayHidden"
			:leave-to-class="bannerStyles.overlayHidden"
		>
			<div
				v-if="showBanner && scrollLock"
				v-bind="config.components?.['iab-banner']?.overlay"
				data-testid="iab-consent-banner-overlay"
				:class="bannerStyles.overlay"
			/>
		</Transition>
		<Transition
			:disabled="disableAnimation"
			:enter-from-class="bannerStyles.bannerHidden"
			:enter-active-class="bannerStyles.bannerVisible"
			:enter-to-class="bannerStyles.bannerVisible"
			:leave-from-class="bannerStyles.bannerVisible"
			:leave-active-class="bannerStyles.bannerHidden"
			:leave-to-class="bannerStyles.bannerHidden"
		>
			<div
				v-if="showBanner"
				v-bind="config.components?.['iab-banner']?.root"
				data-testid="iab-consent-banner-root"
				:class="bannerStyles.root"
			>
				<div
					v-bind="config.components?.['iab-banner']?.cardShell"
					:class="bannerStyles.cardShell"
				>
					<ConsentTag
						v-if="!config.iabBannerHideBranding"
						context="iab-banner"
					/>
					<FocusScope
						:trapped="shouldTrapFocus"
						:loop="shouldTrapFocus"
					>
						<div
							v-bind="config.components?.['iab-banner']?.card"
							data-testid="iab-consent-banner-card"
							:class="bannerStyles.card"
							:role="shouldTrapFocus ? 'dialog' : undefined"
							:aria-modal="shouldTrapFocus ? 'true' : undefined"
							:aria-label="iabT?.banner?.title"
							tabindex="0"
						>
							<div
								v-bind="config.components?.['iab-banner']?.header"
								data-testid="iab-consent-banner-header"
								:class="bannerStyles.header"
							>
								<h2
									v-bind="config.components?.['iab-banner']?.title"
									:class="bannerStyles.title"
								>
									{{ iabT?.banner?.title }}
								</h2>
								<p
									v-bind="config.components?.['iab-banner']?.description"
									:class="bannerStyles.description"
								>
									{{ descriptionParts.before }}
									<button
										v-bind="config.components?.['iab-banner']?.partnersLink"
										type="button"
										:class="bannerStyles.partnersLink"
										data-testid="iab-consent-banner-partners-link"
										@click="openVendors"
									>
										{{ partnersLinkText }}
									</button>
									{{ descriptionParts.after }}
								</p>
								<ul
									v-bind="config.components?.['iab-banner']?.purposeList"
									:class="bannerStyles.purposeList"
								>
									<li
										v-for="(name, index) in bannerSummary.displayItems"
										:key="`${name}-${index}`"
									>
										{{ name }}
									</li>
									<li
										v-if="bannerSummary.remainingCount > 0"
										v-bind="config.components?.['iab-banner']?.purposeMore"
										:class="bannerStyles.purposeMore"
									>
										{{ (iabT?.banner?.andMore ?? '').replace(
										'{count}',
										String(bannerSummary.remainingCount),
									) }}
									</li>
								</ul>
								<p
									v-bind="
										config.components?.['iab-banner']?.legitimateInterestNotice
									"
									:class="bannerStyles.legitimateInterestNotice"
								>
									{{ iabT?.banner?.legitimateInterestNotice }}
									{{ iabT?.banner?.scopeServiceSpecific }}
								</p>
							</div>
							<div
								v-bind="config.components?.['iab-banner']?.footer"
								data-testid="iab-consent-banner-footer"
								:class="bannerStyles.footer"
							>
								<ConsentActions
									:layout="IAB_BANNER_LAYOUT"
									:primary-actions="[primaryButton]"
									:labels="labels"
									secondary-mode="stroke"
									:root-attrs="config.components?.['iab-banner']?.actions as
										object | undefined"
									:group-attrs="config.components?.['iab-banner']?.actionGroup as
										object | undefined"
									@action="onAction"
								/>
							</div>
						</div>
					</FocusScope>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>
