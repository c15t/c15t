<script setup lang="ts">
import {
	type CONSENT_CATEGORY,
	getConsentAvailableCategories,
} from '@c15t/core/v3/consent-record';
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
import type { PolicyUiAction } from '@c15t/schema/types';
import styles from '@c15t/ui/styles/components/consent-widget.module.js';
import {
	buttonVariants,
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
	useHasConsent,
} from '../composables';
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
		noStyle: false,
		language: undefined,
	}
);

const init = useConsentInit();
const config = useConsentConfig();
const granted = useHasConsent();
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

const surface = computed(() => init.value?.policy?.ui?.dialog);
const { actionGroups, direction, primaryActions, shouldFillActions } =
	useConsentPolicyActions(surface);

const categories = computed(() =>
	getConsentAvailableCategories(init.value, config.value.consentCategories)
);

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

function formatConsentName(category: CONSENT_CATEGORY): string {
	return category
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (character) => character.toUpperCase());
}

function consentTitle(category: CONSENT_CATEGORY): string {
	return (
		consentTypeTranslations.value[category]?.title ??
		formatConsentName(category)
	);
}

function consentDescription(category: CONSENT_CATEGORY): string {
	return consentTypeTranslations.value[category]?.description ?? '';
}

/** Draft selection, saved only when the user hits the save action. */
const draft = ref<Record<CONSENT_CATEGORY, boolean>>(
	{} as Record<CONSENT_CATEGORY, boolean>
);

function resetDraft() {
	const grantedSet = new Set(granted.value);
	const next = {} as Record<CONSENT_CATEGORY, boolean>;
	for (const category of categories.value) {
		next[category] = category === 'necessary' || grantedSet.has(category);
	}
	draft.value = next;
}

watch(
	() => [categories.value.join(','), granted.value.join(',')] as const,
	() => resetDraft(),
	{ immediate: true }
);

/** Single-open accordion state (opening one category closes the rest). */
const openItems = ref<Record<string, boolean>>({});

function isOpen(category: CONSENT_CATEGORY): boolean {
	return openItems.value[category] ?? false;
}

function toggleOpenItem(category: CONSENT_CATEGORY) {
	const nextOpen = !isOpen(category);
	openItems.value = Object.fromEntries(
		categories.value.map((current) => [
			current,
			nextOpen && current === category,
		])
	);
}

function toggleConsent(category: CONSENT_CATEGORY) {
	if (category === 'necessary') return;
	draft.value = {
		...draft.value,
		[category]: !(draft.value[category] ?? false),
	};
}

function triggerId(index: number): string {
	return `c15t-preference-item-trigger-${uid}-${index}`;
}

function contentId(index: number): string {
	return `c15t-preference-item-content-${uid}-${index}`;
}

const labels = computed(() => {
	const common = init.value?.translations?.translations?.common;
	return {
		accept: common?.acceptAll ?? 'Accept all',
		reject: common?.rejectAll ?? 'Reject all',
		customize: common?.save ?? 'Save',
	} as Record<PolicyUiAction, string>;
});

const ACTION_TEST_IDS: Record<PolicyUiAction, string> = {
	accept: 'consent-widget-footer-accept-all-button',
	reject: 'consent-widget-reject-button',
	customize: 'consent-widget-footer-save-button',
};

function actionClass(action: PolicyUiAction): string | undefined {
	if (props.noStyle) return undefined;
	return buttonVariants({
		variant: primaryActions.value.includes(action) ? 'primary' : 'neutral',
		mode: 'stroke',
		size: 'small',
	}).root();
}

const isColumn = computed(() => direction.value === 'column');

const footerClass = computed(() =>
	props.noStyle
		? undefined
		: [
				styles.footer,
				shouldFillActions.value ? styles.footerFill : '',
				isColumn.value ? styles.footerColumn : '',
			]
				.filter(Boolean)
				.join(' ')
);

const footerSubGroupClass = computed(() =>
	props.noStyle
		? undefined
		: [
				styles.footerSubGroup,
				shouldFillActions.value ? styles.footerSubGroupFill : '',
				isColumn.value ? styles.footerSubGroupColumn : '',
			]
				.filter(Boolean)
				.join(' ')
);

function onAction(action: PolicyUiAction) {
	if (action === 'accept') {
		save('all');
	} else if (action === 'reject') {
		save('none');
	} else if (action === 'customize') {
		const selected = Object.entries(draft.value)
			.filter(([, enabled]) => enabled)
			.map(([category]) => category as CONSENT_CATEGORY);
		save(selected);
	} else {
		return;
	}
	activeUI.value = null;
}
</script>

<template>
	<div
		:class="noStyle ? undefined : styles.widget"
		:dir="textDirection"
		data-testid="consent-widget-root"
	>
		<div
			:class="noStyle ? undefined : styles.accordionList"
			data-testid="consent-widget-accordion"
		>
			<div
				v-for="(category, index) in categories"
				:key="category"
				:class="noStyle ? undefined : styles.accordionItem"
				data-slot="preference-item-root"
				:data-state="isOpen(category) ? 'open' : 'closed'"
				:data-testid="`consent-widget-accordion-item-${category}`"
			>
				<div :class="noStyle ? undefined : styles.accordionTrigger">
					<button
						:id="triggerId(index)"
						type="button"
						:aria-controls="contentId(index)"
						:aria-expanded="isOpen(category) ? 'true' : 'false'"
						:class="noStyle ? undefined : styles.accordionTriggerInner"
						data-slot="preference-item-trigger"
						:data-state="isOpen(category) ? 'open' : 'closed'"
						:data-testid="`consent-widget-accordion-trigger-${category}`"
						@click="toggleOpenItem(category)"
					>
						<div
							:class="noStyle ? undefined : styles.accordionArrow"
							data-slot="preference-item-leading"
							:data-testid="`consent-widget-accordion-arrow-${category}`"
						>
							<svg
								aria-hidden="true"
								fill="none"
								height="16"
								width="16"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								viewBox="0 0 24 24"
							>
								<path :d="isOpen(category) ? 'M5 12h14' : 'M5 12h14M12 5v14'" />
							</svg>
						</div>
						<div data-slot="preference-item-header">
							<h3
								:class="noStyle ? undefined : styles.accordionTitle"
								data-slot="preference-item-title"
							>
								{{ consentTitle(category) }}
							</h3>
						</div>
					</button>
					<div
						:class="noStyle ? undefined : styles.switch"
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
						pi.content({ class: noStyle ? undefined : styles.accordionContent })
					"
					data-slot="preference-item-content"
					:data-state="isOpen(category) ? 'open' : 'closed'"
					:data-testid="`consent-widget-accordion-content-${category}`"
					:inert="!isOpen(category)"
				>
					<div
						:class="pi.contentViewport()"
						data-slot="preference-item-content-viewport"
					>
						<div
							:class="pi.contentInner()"
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
		>
			<div
				v-for="(group, groupIndex) in actionGroups"
				:key="`group-${group.join('-') || groupIndex}`"
				:class="footerSubGroupClass"
				data-testid="consent-widget-footer-sub-group"
			>
				<button
					v-for="action in group"
					:key="action"
					type="button"
					:class="actionClass(action)"
					:style="shouldFillActions ? { width: '100%', flex: 1 } : undefined"
					:data-testid="ACTION_TEST_IDS[action]"
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
