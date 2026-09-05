<script setup lang="ts">
import type { PresentationAction } from '@c15t/core';
import { DEFAULT_BANNER_POSITION } from '@c15t/schema/config';
import bannerStyles from '@c15t/ui/styles/components/consent-banner';
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
const save = useConsentSave();
const kernel = useConsentKernel();
const snapshot = useConsentSnapshot();

const transitionStyles = bannerStyles as Record<string, string>;

const {
	presentation: surface,
	actionGroups,
	direction,
	primaryActions,
	shouldFillActions,
} = useConsentPolicyActions('prompt');

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

const bannerTitle = computed(
	() =>
		init.value?.translations?.translations?.cookieBanner?.title ??
		(snapshot.value.promptRequirement.kind === 'notice'
			? 'Privacy notice'
			: 'Cookie choices')
);

const bannerPosition = computed(
	() => config.value.bannerPosition ?? DEFAULT_BANNER_POSITION
);

const labels = computed(() => {
	const common = init.value?.translations?.translations?.common;
	return {
		accept: common?.acceptAll ?? 'Accept all',
		customize: common?.customize ?? 'Customize',
		dismiss: 'Dismiss',
		reject: common?.rejectAll ?? 'Reject all',
	} as const;
});

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
				:class="bannerStyles.root"
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
							<div
								v-bind="config.components?.banner?.title"
								data-testid="consent-banner-title"
								:class="bannerStyles.title"
								role="heading"
								aria-level="2"
							>
								{{ bannerTitle }}
							</div>
							<ConsentDescription context="banner" />
						</div>
						<ConsentActions
							data-testid="consent-banner-footer"
							:class="bannerStyles.footer"
							button-size="small"
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
								'data-testid': 'consent-banner-footer-sub-group',
							}"
							@action="onAction"
						/>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>
