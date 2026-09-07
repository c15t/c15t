<script setup lang="ts">
import type { PresentationAction } from '@c15t/core';
import { DEFAULT_BANNER_POSITION } from '@c15t/schema/config';
import type { PolicyRight } from '@c15t/schema/types';
import type { CompleteTranslations } from '@c15t/translations';
import bannerStyles from '@c15t/ui/styles/components/consent-banner';
import { getTextDirection } from '@c15t/ui/utils';
import { computed, mergeProps, ref, Teleport, Transition } from 'vue';

import {
	useConsentActiveUI,
	useConsentConfig,
	useConsentInit,
	useConsentSave,
	useConsentKernel,
	useConsentSnapshot,
} from '../composables';
import { useConsentPolicyActions } from '../composables/use-consent-policy-actions';
import { useConsentScrollLock } from '../composables/use-consent-scroll-lock';
import { useMounted } from '../composables/use-mounted';
import { useFocusTrap } from '../primitives/use-focus-trap';
import ConsentActions from './consent-actions.vue';
import ConsentDescription from './consent-description.vue';
import ConsentTag from './consent-tag.vue';

const mounted = useMounted();
const activeUI = useConsentActiveUI();
const config = useConsentConfig();
const init = useConsentInit();
const textDirection = computed(() =>
	getTextDirection(init.value?.translations?.language)
);
const save = useConsentSave();
const kernel = useConsentKernel();
const snapshot = useConsentSnapshot();

const transitionStyles = bannerStyles as Record<string, string>;

const {
	presentation: surface,
	actionGroups,
	direction,
	primaryActions: resolvedPrimaryActions,
	shouldFillActions,
	uncoveredRights,
} = useConsentPolicyActions('prompt');

/**
 * The wire type lags the translations package, so the newer keys (notice
 * copy, dismiss, rights) are read through the package's own type.
 */
const bundle = computed(
	() =>
		init.value?.translations?.translations as
			| Partial<CompleteTranslations>
			| undefined
);

const promptKind = computed(() => snapshot.value.policyRule.prompt);
const isNotice = computed(() => promptKind.value === 'notice');

/**
 * A notice offers dismiss alone. The resolver's default primary is
 * customize, which a notice never has, so the one action takes the
 * primary treatment instead of rendering every control as neutral.
 */
const primaryActions = computed(() => {
	if (resolvedPrimaryActions.value.length > 0) {
		return resolvedPrimaryActions.value;
	}
	const ordered = actionGroups.value.flat();
	return ordered.length === 1 && ordered[0] === 'dismiss' ? ordered : [];
});

const isOpen = computed(() => {
	const { model } = snapshot.value.policyRule;
	const models = config.value.bannerModels ?? config.value.models;
	const matchesModel =
		!models?.length || (model !== undefined && models.includes(model));
	return (
		activeUI.value === 'banner' &&
		matchesModel &&
		!snapshot.value.policyPending &&
		snapshot.value.promptRequirement.kind !== 'none'
	);
});

const disableAnimation = computed(() => Boolean(config.value.disableAnimation));

const scrollLock = computed(() => surface.value.scrollLock);
useConsentScrollLock(computed(() => isOpen.value && scrollLock.value));

const shouldTrapFocus = computed(() =>
	Boolean(isOpen.value && surface.value.trapFocus)
);
const card = ref<HTMLElement | null>(null);
useFocusTrap(card, () => shouldTrapFocus.value);

const bannerTitle = computed(() => {
	const cookieBanner = bundle.value?.cookieBanner;
	if (isNotice.value) {
		return cookieBanner?.noticeTitle ?? cookieBanner?.title ?? 'Privacy notice';
	}
	return cookieBanner?.title ?? 'Cookie choices';
});

const bannerPosition = computed(
	() => config.value.bannerPosition ?? DEFAULT_BANNER_POSITION
);

const labels = computed(() => {
	const common = bundle.value?.common;
	return {
		accept: common?.acceptAll ?? 'Accept all',
		customize: common?.customize ?? 'Customize',
		dismiss: common?.dismiss ?? 'Dismiss',
		reject: common?.rejectAll ?? 'Reject all',
	} as const;
});

const rightLabels = computed<Record<PolicyRight, string>>(() => {
	const rights = bundle.value?.rights;
	return {
		disclosure: '',
		'opt-out': rights?.optOut ?? 'Do not sell or share my personal information',
		preferences: rights?.preferences ?? 'Manage preferences',
	};
});

/** Every uncovered right opens the preference center, like customize. */
const onRight = function onRight() {
	activeUI.value = 'manager';
};

const actionTestIds = {
	accept: 'consent-banner-accept-button',
	customize: 'consent-banner-customize-button',
	dismiss: 'consent-banner-dismiss-button',
	reject: 'consent-banner-reject-button',
} as const;

const onAction = function onAction(action: PresentationAction) {
	if (action === 'dismiss') {
		void kernel.commands.dismissNotice();
		return;
	}
	if (action === 'customize') {
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
</script>

<template>
	<Teleport
		to="body"
		:disabled="!mounted"
	>
		<Transition
			:css="!disableAnimation"
			:enter-from-class="transitionStyles.overlayHidden"
			:enter-active-class="transitionStyles.overlayVisible"
			:enter-to-class="transitionStyles.overlayVisible"
			:leave-from-class="transitionStyles.overlayVisible"
			:leave-active-class="transitionStyles.overlayHidden"
			:leave-to-class="transitionStyles.overlayHidden"
		>
			<div
				v-if="isOpen && scrollLock"
				v-bind="config.components?.banner?.overlay"
				data-testid="consent-banner-overlay"
				:class="bannerStyles.overlay"
			/>
		</Transition>
		<Transition
			:css="!disableAnimation"
			:enter-from-class="transitionStyles.bannerHidden"
			:enter-active-class="transitionStyles.bannerVisible"
			:enter-to-class="transitionStyles.bannerVisible"
			:leave-from-class="transitionStyles.bannerVisible"
			:leave-active-class="transitionStyles.bannerHidden"
			:leave-to-class="transitionStyles.bannerHidden"
		>
			<div
				v-if="isOpen"
				v-bind="config.components?.banner?.root"
				data-testid="consent-banner-root"
				:data-position="bannerPosition"
				:data-prompt="promptKind"
				:data-model="snapshot.policyRule.model"
				:dir="textDirection"
				:class="[bannerStyles.root, bannerStyles.bannerVisible]"
			>
				<div
					v-bind="config.components?.banner?.cardShell"
					:class="bannerStyles.cardShell"
				>
					<ConsentTag
						v-if="!(config.bannerHideBranding ?? config.hideBranding)"
						context="banner"
					/>
					<div
						ref="card"
						v-bind="config.components?.banner?.card"
						data-testid="consent-banner-card"
						:class="bannerStyles.card"
						:role="shouldTrapFocus ? 'dialog' : 'region'"
						:aria-modal="shouldTrapFocus ? 'true' : undefined"
						:aria-label="bannerTitle"
						tabindex="-1"
					>
						<div
							v-bind="config.components?.banner?.header"
							data-testid="consent-banner-header"
							:class="bannerStyles.header"
						>
							<h2
								v-bind="config.components?.banner?.title"
								data-testid="consent-banner-title"
								:class="bannerStyles.title"
							>
								{{ bannerTitle }}
							</h2>
							<ConsentDescription context="banner" />
						</div>
						<ConsentActions
							data-testid="consent-banner-footer"
							:class="bannerStyles.footer"
							button-size="small"
							group-test-id="consent-banner-footer-sub-group"
							:action-groups="actionGroups"
							:direction="direction"
							:ui-profile="surface?.uiProfile"
							:primary-actions="primaryActions"
							:fill="shouldFillActions"
							:labels="labels"
							:test-ids="actionTestIds"
							:root-attrs="
								mergeProps(
									{ ...config.components?.banner?.footer },
									{ ...config.components?.banner?.actions }
								)
							"
							:group-attrs="{
								...config.components?.banner?.actionGroup,
							}"
							@action="onAction"
						>
							<template #leading>
								<div
									v-if="uncoveredRights.length > 0"
									v-bind="config.components?.banner?.rights"
									data-testid="consent-banner-rights"
									:class="bannerStyles.rights"
								>
									<button
										v-for="right in uncoveredRights"
										:key="right"
										v-bind="config.components?.banner?.rightLink"
										type="button"
										:class="bannerStyles.rightLink"
										:data-right="right"
										:data-testid="`consent-banner-right-link-${right}`"
										@click="onRight"
									>
										{{ rightLabels[right] }}
									</button>
								</div>
							</template>
						</ConsentActions>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>
