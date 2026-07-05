<script
	setup
	lang="ts"
>
import { computed, Teleport, Transition } from 'vue';
import { DEFAULT_BANNER_POSITION } from '@c15t/schema/config';
import type { PolicyUiAction } from '@c15t/schema/types';
import bannerStyles from '@c15t/ui/styles/v3/consent-banner.module.css';
import {
	useConsentActiveUI,
	useConsentConfig,
	useConsentInit,
	useConsentSave,
} from '../composables';
import { FocusScope } from '../primitives';
import ConsentActions from './consent-actions.vue';
import ConsentDescription from './consent-description.vue';
import ConsentTag from './consent-tag.vue';
import { useConsentPolicyActions } from '../composables/use-consent-policy-actions';
import { useConsentScrollLock } from '../composables/use-consent-scroll-lock';

const activeUI = useConsentActiveUI();
const config = useConsentConfig();
const init = useConsentInit();
const save = useConsentSave();
const DEFAULT_ACTIONS: PolicyUiAction[] = ['reject', 'accept', 'customize'];
const transitionStyles = bannerStyles as Record<string, string>;

const surface = computed(() => init.value?.policy?.ui?.banner);
const {
	actionGroups,
	direction,
	primaryActions,
	shouldFillActions,
} = useConsentPolicyActions(surface);

const isOpen = computed(() => {
	const model = init.value?.policy?.model;
	const models = config.value.bannerModels ?? config.value.models;
	const matchesModel =
		!models?.length || (model !== undefined && models.includes(model));
	return activeUI.value === 'banner' && matchesModel;
});

const disableAnimation = computed(() => Boolean(config.value.disableAnimation));

const scrollLock = computed(
	() => init.value?.policy?.ui?.banner?.scrollLock ?? true
);
useConsentScrollLock(computed(() => isOpen.value && scrollLock.value));

const shouldTrapFocus = computed(() =>
	Boolean(isOpen.value && config.value.trapFocus)
);

const bannerTitle = computed(
	() => init.value?.translations?.translations?.cookieBanner?.title
);

const bannerPosition = computed(
	() => config.value.bannerPosition ?? DEFAULT_BANNER_POSITION
);

const labels = computed(() => {
	const common = init.value?.translations?.translations?.common;
	return {
		accept: common?.acceptAll ?? 'Accept all',
		reject: common?.rejectAll ?? 'Reject all',
		customize: common?.customize ?? 'Customize',
	} as const;
});

const actionTestIds = {
	accept: 'consent-banner-accept-button',
	reject: 'consent-banner-reject-button',
	customize: 'consent-banner-customize-button',
} as const;

function onAction(action: PolicyUiAction) {
	if (action === 'customize') {
		activeUI.value = 'manager';
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
	<Teleport to="body">
		<Transition
			:disabled="disableAnimation"
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
			:disabled="disableAnimation"
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
				<div :class="bannerStyles.cardShell">
					<ConsentTag
						v-if="!(config.bannerHideBranding ?? config.hideBranding)"
						context="banner"
					/>
					<FocusScope
						:trapped="shouldTrapFocus"
						:loop="shouldTrapFocus"
					>
						<div
							v-bind="config.components?.banner?.card"
							data-testid="consent-banner-card"
							:class="bannerStyles.card"
							:role="shouldTrapFocus ? 'dialog' : undefined"
							:aria-modal="shouldTrapFocus ? 'true' : undefined"
							:aria-label="shouldTrapFocus ? bannerTitle : undefined"
							tabindex="0"
						>
							<div
								v-bind="config.components?.banner?.header"
								:class="bannerStyles.header"
							>
								<div
									v-bind="config.components?.banner?.title"
									data-testid="consent-banner-title"
									:class="bannerStyles.title"
								>
									{{ init?.translations?.translations?.cookieBanner?.title }}
								</div>
								<ConsentDescription context="banner" />
							</div>
							<div
								v-bind="config.components?.banner?.footer"
								data-testid="consent-banner-footer"
								:class="bannerStyles.footer"
							>
								<ConsentActions
									:action-groups="actionGroups.length ? actionGroups : [DEFAULT_ACTIONS]"
									:direction="direction"
									:ui-profile="surface?.uiProfile"
									:primary-actions="primaryActions"
									:fill="shouldFillActions"
									:labels="labels"
									:test-ids="actionTestIds"
									:root-attrs="config.components?.banner?.actions as
										object | undefined"
									:group-attrs="config.components?.banner?.actionGroup as
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
