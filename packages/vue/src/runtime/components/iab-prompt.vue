<script setup lang="ts">
import type { PresentationAction } from '@c15t/core';
import { saveIABConsentSurface } from '@c15t/core/surface-actions';
import { resolveIABBannerSummary } from '@c15t/iab/headless';
import bannerStyles from '@c15t/ui/styles/components/iab-consent-banner';

import '@c15t/ui/styles/components/iab-consent-banner.css';
import { getTextDirection } from '@c15t/ui/utils';
import { computed, ref, Teleport, Transition, toValue } from 'vue';

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
	useConsentSnapshot,
	useHasConsentUi,
} from '../composables/kernel';
import { useConsentPolicyActions } from '../composables/use-consent-policy-actions';
import { useConsentScrollLock } from '../composables/use-consent-scroll-lock';
import { useLateEntry } from '../composables/use-late-entry';
import { useFocusTrap } from '../primitives/use-focus-trap';
import { slotAttrs } from '../utils/slot-attrs';
import ConsentActions from './actions.vue';
import ConsentTag from './tag.vue';

const IAB_BANNER_LAYOUT: (PresentationAction | PresentationAction[])[] = [
	['reject', 'accept'],
	'customize',
];

/** Canonical contract test-ids (parity with the React/Svelte IAB banners). */
const IAB_BANNER_ACTION_TEST_IDS: Partial<Record<PresentationAction, string>> =
	{
		accept: 'iab-consent-banner-accept-button',
		customize: 'iab-consent-banner-customize-button',
		reject: 'iab-consent-banner-reject-button',
	};

const props = withDefaults(
	defineProps<{
		primaryButton?: 'reject' | 'accept' | 'customize';
		/** Skip the enter and exit animations. Defaults to the config's. */
		disableAnimation?: boolean;
	}>(),
	{
		disableAnimation: undefined,
		primaryButton: 'customize',
	}
);

const activeUI = useConsentActiveUI();
const config = useConsentConfig();
const init = useConsentInit();
const snapshot = useConsentSnapshot();
const iabSelection = useConsentIabSelection();
const kernel = useConsentKernel();
const saveIab = useConsentIabSave();
// The banner closes in the click task; see `saveIABConsentSurface`.
const save = (...args: Parameters<typeof saveIab>) =>
	saveIABConsentSurface(kernel, () => saveIab(...args));

const initValue = computed(() => toValue(init));
const textDirection = computed(() =>
	getTextDirection(initValue.value?.translations?.language)
);
const gvl = computed(() => initValue.value?.gvl ?? null);
const customVendors = computed(() => initValue.value?.customVendors ?? []);

const hasConsentUi = useHasConsentUi();
const isOpen = computed(() => {
	if (!hasConsentUi.value) {
		return false;
	}
	const models = config.value.iabBannerModels;
	const { model } = snapshot.value.policyRule;
	const matchesModel =
		!models?.length ||
		(model !== undefined && model !== 'none' && models.includes(model));
	return (
		activeUI.value === 'banner' &&
		snapshot.value.policyRule.model === 'iab' &&
		Boolean(gvl.value || initValue.value?.gvlReference) &&
		matchesModel
	);
});
const disableAnimation = computed(() =>
	Boolean(props.disableAnimation ?? toValue(config).disableAnimation)
);

const iabT = useIabTranslations();

const labels = computed(() => ({
	accept: iabT.value?.common?.acceptAll ?? 'Accept all',
	customize: iabT.value?.common?.customize ?? 'Customize',
	reject: iabT.value?.common?.rejectAll ?? 'Reject all',
}));

// The summary — which purposes, stacks and special features the banner
// names, and how many it leaves out — comes from the shared model in
// `@c15t/iab/headless`, so the four banners list the same things.
const bannerSummary = computed(() =>
	resolveIABBannerSummary({
		customVendors: customVendors.value,
		gvl: gvl.value,
		gvlReference: initValue.value?.gvlReference,
	})
);

const showBanner = computed(
	() =>
		isOpen.value &&
		Boolean(gvl.value || initValue.value?.gvlReference) &&
		bannerSummary.value.isReady
);
// A banner that opens after the page painted fades in.
const lateEntry = useLateEntry(showBanner);
const entryAttribute = computed(() =>
	lateEntry.value && !disableAnimation.value ? 'late' : undefined
);

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
		return { after: '', before: text };
	}

	const [before, after] = text.split(link);
	return { after: after ?? '', before: before ?? text };
});

const onAction = async function onAction(action: PresentationAction) {
	try {
		if (action === 'customize') {
			iabSelection.value.preferenceCenterTab = 'purposes';
			activeUI.value = 'manager';
			return;
		}
		if (action === 'accept') {
			await save('all');
			return;
		}
		if (action === 'reject') {
			await save('none');
		}
	} catch {
		// Leave the prompt available so a failed vendor-list load can be retried.
	}
};

const openVendors = function openVendors() {
	iabSelection.value.preferenceCenterTab = 'vendors';
	activeUI.value = 'manager';
};

// The footer *is* the action root, the way it is in React: one element
// carrying both class sets, not a wrapper around another one.
const footerAttrs = computed(() => ({
	...((config.value.components?.['iab-banner']?.footer as object | undefined) ??
		{}),
	...((config.value.components?.['iab-banner']?.actions as
		| object
		| undefined) ?? {}),
}));

const { presentation } = useConsentPolicyActions('prompt', () => ({
	layout: IAB_BANNER_LAYOUT,
	primaryActions: [props.primaryButton],
}));
const scrollLock = computed(() => presentation.value.scrollLock);

useConsentScrollLock(computed(() => Boolean(isOpen.value && scrollLock.value)));

const shouldTrapFocus = computed(() =>
	Boolean(isOpen.value && presentation.value.blocking)
);
const bannerCard = ref<HTMLElement | null>(null);
useFocusTrap(bannerCard, () => shouldTrapFocus.value);
</script>

<template>
	<Teleport to="body">
		<Transition
			:css="!disableAnimation"
			:enter-from-class="''"
			:enter-active-class="bannerStyles.overlayVisible"
			:enter-to-class="bannerStyles.overlayVisible"
			:leave-from-class="bannerStyles.overlayVisible"
			:leave-active-class="bannerStyles.overlayHidden"
			:leave-to-class="bannerStyles.overlayHidden"
		>
			<div
				v-if="showBanner && scrollLock"
				v-bind="
					slotAttrs(config.components?.['iab-banner']?.overlay, [
						bannerStyles.overlay,
						bannerStyles.overlayVisible,
						disableAnimation ? undefined : bannerStyles.overlayEntering,
					])
				"
				aria-hidden="true"
				:data-entry="entryAttribute"
				data-testid="iab-consent-banner-overlay"
			/>
		</Transition>
		<Transition
			:css="!disableAnimation"
			:enter-from-class="''"
			:enter-active-class="bannerStyles.bannerVisible"
			:enter-to-class="bannerStyles.bannerVisible"
			:leave-from-class="bannerStyles.bannerVisible"
			:leave-active-class="bannerStyles.bannerHidden"
			:leave-to-class="bannerStyles.bannerHidden"
		>
			<div
				v-if="showBanner"
				v-bind="
					slotAttrs(config.components?.['iab-banner']?.root, [
						bannerStyles.root,
						bannerStyles.bannerVisible,
						disableAnimation ? undefined : bannerStyles.bannerEntering,
					])
				"
				data-testid="iab-consent-banner-root"
				:data-entry="entryAttribute"
				:data-position="
					textDirection === 'ltr' ? 'bottom-left' : 'bottom-right'
				"
				:dir="textDirection"
				tabindex="-1"
			>
				<div
					v-bind="config.components?.['iab-banner']?.cardShell"
					:class="bannerStyles.cardShell"
				>
					<ConsentTag
						v-if="!config.iabBannerHideBranding"
						context="iab-banner"
					/>
					<div
						v-bind="
							slotAttrs(
								config.components?.['iab-banner']?.card,
								bannerStyles.card
							)
						"
						ref="bannerCard"
						data-testid="iab-consent-banner-card"
						:role="shouldTrapFocus ? 'dialog' : 'region'"
						:aria-modal="shouldTrapFocus ? 'true' : undefined"
						:aria-label="iabT?.banner?.title"
					>
						<div
							v-bind="
								slotAttrs(
									config.components?.['iab-banner']?.header,
									bannerStyles.header
								)
							"
							data-testid="iab-consent-banner-header"
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
									{{
										(iabT?.banner?.andMore ?? '').replace(
											'{count}',
											String(bannerSummary.remainingCount)
										)
									}}
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
						<ConsentActions
							:action-groups="presentation.actionGroups"
							:direction="presentation.direction"
							:primary-actions="presentation.primaryActions"
							:labels="labels"
							:test-ids="IAB_BANNER_ACTION_TEST_IDS"
							primary-mode="filled"
							secondary-mode="stroke"
							root-test-id="iab-consent-banner-footer"
							:root-class="bannerStyles.footer"
							:root-attrs="footerAttrs"
							:group-attrs="
								config.components?.['iab-banner']?.actionGroup as
									object | undefined
							"
							@action="onAction"
						/>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>
