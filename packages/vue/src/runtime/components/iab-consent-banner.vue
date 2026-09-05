<script setup lang="ts">
import { resolveIABBannerSummary } from '@c15t/iab/headless';
import type { PolicyUiAction } from '@c15t/schema/types';
import bannerStyles from '@c15t/ui/styles/components/iab-consent-banner';
import { getTextDirection } from '@c15t/ui/utils';
import { computed, ref, Teleport, Transition, toValue } from 'vue';

import {
	useConsentActiveUI,
	useConsentConfig,
	useConsentIabSave,
	useConsentIabSelection,
	useConsentInit,
} from '#c15t/composables';

import { useConsentScrollLock } from '../composables/use-consent-scroll-lock';
import { useFocusTrap } from '../primitives/use-focus-trap';
import ConsentActions from './consent-actions.vue';
import ConsentTag from './consent-tag.vue';

const IAB_BANNER_LAYOUT: (PolicyUiAction | PolicyUiAction[])[] = [
	['reject', 'accept'],
	'customize',
];

/** Canonical contract test-ids (parity with the React/Svelte IAB banners). */
const IAB_BANNER_ACTION_TEST_IDS: Partial<Record<PolicyUiAction, string>> = {
	accept: 'iab-consent-banner-accept-button',
	customize: 'iab-consent-banner-customize-button',
	reject: 'iab-consent-banner-reject-button',
};

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
const textDirection = computed(() =>
	getTextDirection(initValue.value?.translations?.language)
);
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
	customize: iabT.value?.common?.customize ?? 'Customize',
	reject: iabT.value?.common?.rejectAll ?? 'Reject all',
}));

// The summary — which purposes, stacks and special features the banner
// names, and how many it leaves out — comes from the shared model in
// `@c15t/iab/headless`, so the four banners list the same things.
const bannerSummary = computed(() =>
	resolveIABBannerSummary(
		gvl.value ? { customVendors: customVendors.value, gvl: gvl.value } : null
	)
);

const showBanner = computed(
	() => isOpen.value && Boolean(gvl.value) && bannerSummary.value.isReady
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

const onAction = function onAction(action: PolicyUiAction) {
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

const scrollLock = computed(
	() => initValue.value?.policy?.ui?.banner?.scrollLock ?? true
);

useConsentScrollLock(computed(() => Boolean(isOpen.value && scrollLock.value)));

const shouldTrapFocus = computed(() =>
	Boolean(isOpen.value && (toValue(config).trapFocus ?? true))
);
// The trap goes on the root, not the card: `setupFocusTrap` stamps
// `tabindex="-1"` on whatever it is given, and the root is the element
// that declares one in every other adapter.
const bannerRoot = ref<HTMLElement | null>(null);
useFocusTrap(bannerRoot, () => shouldTrapFocus.value);
</script>

<template>
	<Teleport to="body">
		<Transition
			:css="!disableAnimation"
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
				aria-hidden="true"
				data-testid="iab-consent-banner-overlay"
				:class="[bannerStyles.overlay, bannerStyles.overlayVisible]"
			/>
		</Transition>
		<Transition
			:css="!disableAnimation"
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
				ref="bannerRoot"
				data-testid="iab-consent-banner-root"
				:data-position="
					textDirection === 'ltr' ? 'bottom-left' : 'bottom-right'
				"
				:dir="textDirection"
				tabindex="-1"
				:class="[bannerStyles.root, bannerStyles.bannerVisible]"
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
						v-bind="config.components?.['iab-banner']?.card"
						data-testid="iab-consent-banner-card"
						:class="bannerStyles.card"
						role="dialog"
						:aria-modal="shouldTrapFocus ? 'true' : undefined"
						:aria-label="iabT?.banner?.title"
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
							:layout="IAB_BANNER_LAYOUT"
							:primary-actions="[primaryButton]"
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
