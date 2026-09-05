<script setup lang="ts">
/**
 * Inline consent-management widget for settings and privacy pages.
 *
 * Renders the shared consent-widget DOM contract (see
 * `@c15t/conformance` — `DOM_CONTRACT.consentWidget` and
 * `TEST_IDS.consentWidget`): a single-open category accordion with
 * per-category switches and a policy-driven action footer. The markup,
 * class names, and ARIA attributes intentionally mirror the React and
 * Svelte `ConsentWidget` implementations so the cross-framework parity
 * runner sees identical DOM.
 */
import type { PresentationAction } from '@c15t/core';
import type { CONSENT_CATEGORY } from '@c15t/core/consent-record';
import accordionStyles from '@c15t/ui/styles/components/accordion';
import buttonStyles from '@c15t/ui/styles/components/button';
import actionStyles from '@c15t/ui/styles/components/consent-actions';
import managerStyles from '@c15t/ui/styles/components/consent-manager';
import {
	preferenceItemVariants,
	switchVariants,
} from '@c15t/ui/styles/primitives';
import { getTextDirection } from '@c15t/ui/utils/dom';
import { computed, ref, useId, watch } from 'vue';

import {
	useConsentActiveUI,
	useConsentConfig,
	useConsentInit,
	useConsentSave,
} from '../composables';
import { useConsentDraft } from '../composables/draft';
import { useConsentPolicyActions } from '../composables/use-consent-policy-actions';
import ConsentTag from './consent-tag.vue';

const props = withDefaults(
	defineProps<{
		/** Hide the "Secured by" branding tag. Defaults to true. */
		hideBranding?: boolean;
		/** Drop the built-in widget styling. */
		noStyle?: boolean;
		/** Language override used for text direction. */
		language?: string;
	}>(),
	{
		hideBranding: true,
		language: undefined,
		noStyle: false,
	}
);

const init = useConsentInit();
const config = useConsentConfig();

const activeUI = useConsentActiveUI();
const save = useConsentSave();

const pi = preferenceItemVariants();
const sw = switchVariants({ size: 'small' });

/**
 * One stable id per mounted widget; per-category ids append the category
 * index. React/Svelte derive these from `useId()`-style auto ids — the
 * parity normalizer masks the auto suffix on both sides.
 */
const uid = useId();

const {
	presentation: surface,
	actionGroups,
	direction,
	primaryActions,
	shouldFillActions,
} = useConsentPolicyActions('preferences');

const textDirection = computed(() =>
	getTextDirection(props.language ?? init.value?.translations?.language)
);

const consentTypeTranslations = computed(
	() =>
		(init.value?.translations?.translations?.consentTypes ?? {}) as Record<
			string,
			{ title?: string; description?: string }
		>
);

const formatConsentName = function formatConsentName(
	category: CONSENT_CATEGORY
): string {
	return category
		.replace(/_/gu, ' ')
		.replace(/\b\w/gu, (character) => character.toUpperCase());
};

const consentTitle = function consentTitle(category: CONSENT_CATEGORY): string {
	return (
		consentTypeTranslations.value[category]?.title ??
		formatConsentName(category)
	);
};

const consentDescription = function consentDescription(
	category: CONSENT_CATEGORY
): string {
	return consentTypeTranslations.value[category]?.description ?? '';
};

/** Draft selection, saved only when the user hits the save action. */
const {
	values: draft,
	displayedCategories: draftCategories,
	isStale,
	reset: resetDraft,
	save: saveDraft,
} = useConsentDraft();
const categories = draftCategories;

/** Single-open accordion state (opening one category closes the rest). */
const openItems = ref<Record<string, boolean>>({});

const isOpen = function isOpen(category: CONSENT_CATEGORY): boolean {
	return openItems.value[category] ?? false;
};

const toggleOpenItem = function toggleOpenItem(category: CONSENT_CATEGORY) {
	const nextOpen = !isOpen(category);
	openItems.value = Object.fromEntries(
		categories.value.map((current) => [
			current,
			nextOpen && current === category,
		])
	);
};

const toggleConsent = function toggleConsent(category: CONSENT_CATEGORY) {
	if (category === 'necessary') {
		return;
	}
	draft.value = {
		...draft.value,
		[category]: !(draft.value[category] ?? false),
	};
};

const triggerId = function triggerId(index: number): string {
	return `c15t-preference-item-trigger-${uid}-${index}`;
};

const contentId = function contentId(index: number): string {
	return `c15t-preference-item-content-${uid}-${index}`;
};

const labels = computed(() => {
	const common = init.value?.translations?.translations?.common;
	return {
		accept: common?.acceptAll ?? 'Accept all',
		reject: common?.rejectAll ?? 'Reject all',
		save: common?.save ?? 'Save',
	} as Partial<Record<PresentationAction, string>>;
});

const ACTION_TEST_IDS: Partial<Record<PresentationAction, string>> = {
	accept: 'consent-widget-footer-accept-all-button',
	reject: 'consent-widget-reject-button',
	save: 'consent-widget-footer-save-button',
};

const actionClass = function actionClass(): string | undefined {
	if (props.noStyle) {
		return undefined;
	}
	return buttonStyles.button;
};

const actionVariant = function actionVariant(
	action: PresentationAction
): 'primary' | 'neutral' {
	return primaryActions.value.includes(action) ? 'primary' : 'neutral';
};

const isSplitLayout = computed(() => actionGroups.value.length > 1);

const footerClass = computed(() =>
	props.noStyle
		? undefined
		: `${managerStyles.footer} ${actionStyles.actionRoot}`
);

const footerSubGroupClass = computed(() =>
	props.noStyle ? undefined : actionStyles.actionGroup
);

const onAction = async function onAction(action: PresentationAction) {
	if (action === 'accept') {
		save('all');
	} else if (action === 'reject') {
		save('none');
	} else if (action === 'save') {
		await saveDraft();
	}
};
</script>

<template>
	<div
		v-if="isStale"
		role="status"
	>
		Privacy choices have changed.
		<button
			type="button"
			@click="resetDraft"
		>
			Review updated choices
		</button>
	</div>
	<div
		:class="noStyle ? undefined : managerStyles.manager"
		:dir="textDirection"
		data-testid="consent-widget-root"
	>
		<div
			:class="noStyle ? undefined : accordionStyles.list"
			data-testid="consent-widget-accordion"
		>
			<div
				v-for="(category, index) in categories"
				:key="category"
				:class="noStyle ? undefined : accordionStyles.item"
				data-slot="preference-item-root"
				:data-state="isOpen(category) ? 'open' : 'closed'"
				:data-testid="`consent-widget-accordion-item-${category}`"
			>
				<div :class="noStyle ? undefined : accordionStyles.triggerRow">
					<button
						:id="triggerId(index)"
						type="button"
						:aria-controls="contentId(index)"
						:aria-expanded="isOpen(category) ? 'true' : 'false'"
						:class="noStyle ? undefined : accordionStyles.trigger"
						data-slot="preference-item-trigger"
						:data-state="isOpen(category) ? 'open' : 'closed'"
						:data-testid="`consent-widget-accordion-trigger-${category}`"
						@click="toggleOpenItem(category)"
					>
						<div
							:class="noStyle ? undefined : accordionStyles.arrow"
							data-slot="preference-item-leading"
							:data-testid="`consent-widget-accordion-arrow-${category}`"
						>
							<svg
								fill="none"
								height="16"
								width="16"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								viewBox="0 0 24 24"
							>
								<title>{{ isOpen(category) ? 'Close' : 'Open' }}</title>
								<path :d="isOpen(category) ? 'M5 12h14' : 'M5 12h14M12 5v14'" />
							</svg>
						</div>
						<div data-slot="preference-item-header">
							<h3
								:class="noStyle ? undefined : accordionStyles.title"
								data-slot="preference-item-title"
							>
								{{ consentTitle(category) }}
							</h3>
						</div>
					</button>
					<div
						:class="noStyle ? undefined : accordionStyles.control"
						data-slot="preference-item-control"
					>
						<button
							type="button"
							role="switch"
							:aria-checked="draft[category] ? 'true' : 'false'"
							:aria-label="consentTitle(category)"
							:class="noStyle ? undefined : sw.root()"
							:data-disabled="category === 'necessary' ? '' : undefined"
							data-slot="switch"
							:data-state="draft[category] ? 'checked' : 'unchecked'"
							:data-testid="`consent-widget-switch-${category}`"
							:disabled="category === 'necessary'"
							@click="toggleConsent(category)"
						>
							<span
								:class="
									noStyle
										? undefined
										: sw.track({ disabled: category === 'necessary' })
								"
								data-slot="switch-track"
							>
								<span
									:class="
										noStyle
											? undefined
											: sw.thumb({ disabled: category === 'necessary' })
									"
									data-slot="switch-thumb"
								/>
							</span>
						</button>
					</div>
				</div>
				<div
					:id="contentId(index)"
					:aria-hidden="isOpen(category) ? 'false' : 'true'"
					:aria-labelledby="triggerId(index)"
					:class="
						pi.content({ class: noStyle ? undefined : accordionStyles.content })
					"
					data-slot="preference-item-content"
					:data-state="isOpen(category) ? 'open' : 'closed'"
					:data-testid="`consent-widget-accordion-content-${category}`"
					:inert="!isOpen(category)"
				>
					<div
						:class="
							pi.contentViewport({
								class: noStyle ? undefined : accordionStyles.contentViewport,
							})
						"
						data-slot="preference-item-content-viewport"
					>
						<div
							:class="
								pi.contentInner({
									class: noStyle ? undefined : accordionStyles.contentInner,
								})
							"
							data-slot="preference-item-content-inner"
						>
							{{ consentDescription(category) }}
						</div>
					</div>
				</div>
			</div>
		</div>
		<div
			:class="footerClass"
			data-testid="consent-widget-footer"
			:data-direction="direction"
			:data-fill="shouldFillActions ? true : undefined"
			:data-split="isSplitLayout && !shouldFillActions ? true : undefined"
		>
			<div
				v-for="(group, groupIndex) in actionGroups"
				:key="`group-${group.join('-') || groupIndex}`"
				:class="footerSubGroupClass"
				data-testid="consent-widget-footer-sub-group"
				:data-direction="direction"
				:data-fill="shouldFillActions ? true : undefined"
			>
				<button
					v-for="action in group"
					:key="action"
					type="button"
					:class="actionClass()"
					:disabled="isStale"
					:data-action="action"
					:data-mode="noStyle ? undefined : 'stroke'"
					:data-size="noStyle ? undefined : 'small'"
					:data-testid="ACTION_TEST_IDS[action]"
					:data-variant="noStyle ? undefined : actionVariant(action)"
					@click="onAction(action)"
				>
					{{ labels[action] }}
				</button>
			</div>
		</div>
		<ConsentTag
			v-if="!hideBranding"
			context="dialog"
			data-testid="consent-widget-branding"
		/>
	</div>
</template>
