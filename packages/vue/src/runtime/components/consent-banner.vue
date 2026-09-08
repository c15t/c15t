<script setup lang="ts">
import type {
	PresentationAction,
	PromptPosition,
	PromptVariant,
} from '@c15t/core';
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

/**
 * Local overrides for the surface shape. Each one beats the host
 * `presentation.prompt` value; leave them unset to follow the policy
 * defaults (every prompt renders as a floating card unless the host
 * chooses otherwise).
 * `blocking` defaults to `undefined` on purpose: Vue would otherwise cast
 * an absent boolean prop to `false` and override the host value.
 */
const props = withDefaults(
	defineProps<{
		/** Surface shape: `floating`, `bar`, `widget` or `wall`. */
		variant?: PromptVariant;
		/** Position, validated against the resolved variant. */
		position?: PromptPosition;
		/** Backdrop, scroll lock, focus trap and no outside dismissal. */
		blocking?: boolean;
	}>(),
	{ blocking: undefined, position: undefined, variant: undefined }
);

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
	blocking,
	direction,
	position,
	positionSource,
	primaryActions: resolvedPrimaryActions,
	shouldFillActions,
	uncoveredRights,
	variant,
} = useConsentPolicyActions('prompt', () => ({
	blocking: props.blocking,
	position: props.position,
	variant: props.variant,
}));

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

/**
 * A defaulted corner mirrors for right-to-left text so the card sits at
 * the reading start. A host-chosen position is kept as written.
 */
const resolvedPosition = computed(() => {
	const { value } = position;
	if (
		positionSource.value === 'host' ||
		textDirection.value !== 'rtl' ||
		(variant.value !== 'floating' && variant.value !== 'widget')
	) {
		return value;
	}
	if (value.endsWith('-left')) {
		return value.replace('-left', '-right') as PromptPosition;
	}
	if (value.endsWith('-right')) {
		return value.replace('-right', '-left') as PromptPosition;
	}
	return value;
});

/**
 * A notice exists only under the opt-out model, where every category is
 * already permitted, so its one action reads "Accept All". It still
 * records a dismissal, never a choice. Hosts that prefer a neutral
 * acknowledgement can label it with `common.dismiss` instead.
 */
const labels = computed(() => {
	const common = bundle.value?.common;
	return {
		accept: common?.acceptAll ?? 'Accept all',
		customize: common?.customize ?? 'Customize',
		dismiss: common?.acceptAll ?? 'Accept all',
		reject: common?.rejectAll ?? 'Reject all',
	} as const;
});

const rightLabels = computed<Record<PolicyRight, string>>(() => {
	const rights = bundle.value?.rights;
	return {
		disclosure: '',
		'opt-out': rights?.optOut ?? 'Do not sell or share my data',
		preferences: rights?.preferences ?? 'Manage preferences',
	};
});

/**
 * Every uncovered right opens the preference center, like customize. It
 * renders as underlined text next to the primary action so Accept All is
 * the only button and keeps the visual lead.
 */
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
				aria-hidden="true"
				data-testid="consent-banner-overlay"
				:class="[
					bannerStyles.overlay,
					disableAnimation ? undefined : bannerStyles.overlayVisible,
				]"
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
				:data-variant="variant"
				:data-position="resolvedPosition"
				:data-blocking="blocking ? 'true' : undefined"
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
						:role="blocking || shouldTrapFocus ? 'dialog' : 'region'"
						:aria-modal="blocking || shouldTrapFocus ? 'true' : undefined"
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
										data-action="right"
										:data-c15t-rights="snapshot.policyRule.rights.join(' ')"
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
