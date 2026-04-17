<script lang="ts">
import styles from '@c15t/ui/styles/components/consent-widget.module.js';
import { switchVariants } from '@c15t/ui/styles/primitives';
import {
	getTextDirection,
	resolvePolicyActionGroups,
	resolvePolicyAllowedActions,
	resolvePolicyDirection,
	resolvePolicyOrderedActions,
	resolvePolicyPrimaryActions,
	resolveTranslations,
	shouldFillPolicyActions,
} from '@c15t/ui/utils';
import type { AllConsentNames } from 'c15t';
import { defaultTranslationConfig } from 'c15t';
import {
	getConsentContext,
	getThemeContext,
	getTrackingContext,
	setTrackingContext,
} from '../context.svelte';
import { PreferenceItem, Switch } from '../primitives';
import { resolveComponentStyles } from '../utils';
import Branding from './branding.svelte';
import ConsentButton from './consent-button.svelte';
import PolicyActionsRenderer from './policy-actions-renderer.svelte';

const sw = switchVariants({ size: 'small' });

let {
	hideBranding = true,
	noStyle: localNoStyle,
	class: className,
}: {
	hideBranding?: boolean;
	noStyle?: boolean;
	class?: string;
} = $props();

const consent = getConsentContext();
const theme = getThemeContext();
const parentTracking = getTrackingContext();
setTrackingContext({ uiSource: parentTracking.uiSource ?? 'widget' });

const noStyle = $derived(localNoStyle ?? theme.noStyle ?? false);

const translations = $derived(
	resolveTranslations(consent.state.translationConfig, defaultTranslationConfig)
);

const textDirection = $derived(
	getTextDirection(consent.state.translationConfig?.defaultLanguage)
);

const displayedConsents = $derived(
	consent.state.consentTypes.filter((ct) =>
		consent.state.consentCategories.includes(ct.name)
	)
);

let openItem = $state('');

function toggleConsent(name: string, checked: boolean) {
	consent.state.setSelectedConsent(name as AllConsentNames, checked);
}

function toggleOpenItem(name: string, open: boolean) {
	openItem = open ? name : openItem === name ? '' : openItem;
}

function formatConsentName(name: AllConsentNames): string {
	return (name as string)
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (c: string) => c.toUpperCase());
}

// Per-element theme key resolution
const widgetRootStyle = $derived(
	resolveComponentStyles(
		'consentWidget',
		theme.theme,
		{ baseClassName: styles.widget, className },
		noStyle
	)
);

const footerStyle = $derived(
	resolveComponentStyles(
		'consentWidgetFooter',
		theme.theme,
		{ baseClassName: styles.footer, noStyle },
		noStyle
	)
);

const footerGroupStyle = $derived(
	resolveComponentStyles(
		'consentWidgetFooter',
		theme.theme,
		{ baseClassName: styles.footerSubGroup, noStyle },
		noStyle
	)
);

const allowedActions = $derived(
	resolvePolicyAllowedActions({
		allowedActions: consent.state.policyDialog.allowedActions,
	})
);

const orderedActions = $derived(
	resolvePolicyOrderedActions({
		allowedActions,
		layout: consent.state.policyDialog.layout,
	})
);

const actionGroups = $derived(
	resolvePolicyActionGroups({
		allowedActions,
		layout: consent.state.policyDialog.layout,
	})
);

const direction = $derived(
	resolvePolicyDirection(consent.state.policyDialog.direction)
);

const primaryActions = $derived(
	resolvePolicyPrimaryActions({
		orderedActions,
		primaryActions: consent.state.policyDialog.primaryActions,
	})
);

const shouldFillActions = $derived(
	shouldFillPolicyActions({
		uiProfile: consent.state.policyDialog.uiProfile,
		actionGroups,
		direction,
	})
);
</script>

<div
	class={noStyle ? className : widgetRootStyle.className || ''}
	dir={textDirection}
	data-testid="consent-widget-root"
>
	<div class={noStyle ? '' : styles.accordionList || ''} data-testid="consent-widget-accordion">
		{#each displayedConsents as consentType (consentType.name)}
			{@const isOpen = openItem === consentType.name}
			{@const isChecked =
				consent.state.selectedConsents?.[consentType.name] ??
				consent.state.consents[consentType.name] ??
				false}
			{@const isDisabled = consentType.disabled ?? false}
			<PreferenceItem.Root
				class={noStyle ? '' : styles.accordionItem || ''}
				open={isOpen}
				noStyle
				onOpenChange={(details) => toggleOpenItem(consentType.name, details.open)}
				data-testid={`consent-widget-accordion-item-${consentType.name}`}
			>
				<div class={noStyle ? '' : styles.accordionTrigger || ''}>
					<PreferenceItem.Trigger
						class={noStyle ? '' : styles.accordionTriggerInner || ''}
						data-testid={`consent-widget-accordion-trigger-${consentType.name}`}
					>
						<PreferenceItem.Leading
							class={noStyle ? '' : styles.accordionArrow || ''}
							data-testid={`consent-widget-accordion-arrow-${consentType.name}`}
						>
							<svg
								class={noStyle ? '' : styles.accordionArrowIcon || ''}
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden={true}
							>
								{#if isOpen}
									<path d="M5 12h14" />
								{:else}
									<path d="M5 12h14M12 5v14" />
								{/if}
							</svg>
						</PreferenceItem.Leading>
						<PreferenceItem.Header>
							<PreferenceItem.Title class={noStyle ? '' : styles.accordionTitle || ''}>
								{translations.consentTypes[consentType.name]?.title ??
									formatConsentName(consentType.name)}
							</PreferenceItem.Title>
						</PreferenceItem.Header>
					</PreferenceItem.Trigger>

					<PreferenceItem.Control class={noStyle ? '' : styles.switch || ''}>
						<Switch.Root
							aria-label={translations.consentTypes[consentType.name]?.title ??
								formatConsentName(consentType.name)}
							checked={isChecked}
							onCheckedChange={(details: { checked: boolean }) =>
								toggleConsent(consentType.name, details.checked)}
							disabled={isDisabled}
							class={noStyle ? '' : sw.root()}
							data-testid={`consent-widget-switch-${consentType.name}`}
						>
							<Switch.Control class={noStyle ? '' : sw.track({ disabled: isDisabled })}>
								<Switch.Thumb class={noStyle ? '' : sw.thumb({ disabled: isDisabled })} />
							</Switch.Control>
							<Switch.HiddenInput />
						</Switch.Root>
					</PreferenceItem.Control>
				</div>

				<PreferenceItem.Content
					class={noStyle ? '' : styles.accordionContent || ''}
					data-testid={`consent-widget-accordion-content-${consentType.name}`}
				>
					{translations.consentTypes[consentType.name]?.description ??
						consentType.description ??
						''}
				</PreferenceItem.Content>
			</PreferenceItem.Root>
		{/each}
	</div>

	<PolicyActionsRenderer
		actionGroups={actionGroups}
		primaryActions={primaryActions}
		shouldFillActions={shouldFillActions}
		{direction}
		footerClassName={noStyle ? '' : footerStyle.className || ''}
		footerFillClassName={styles.footerFill || ''}
		footerColumnClassName={styles.footerColumn || ''}
		footerSubGroupClassName={noStyle ? '' : footerGroupStyle.className || ''}
		footerSubGroupFillClassName={styles.footerSubGroupFill || ''}
		footerSubGroupColumnClassName={styles.footerSubGroupColumn || ''}
		actionButtonFillClassName={styles.actionButtonFill || ''}
		footerTestId="consent-widget-footer"
		footerSubGroupTestId="consent-widget-footer-sub-group"
	>
		{#snippet renderAction(action: string, isPrimary: boolean, actionClassName?: string)}
			{#if action === 'reject'}
				<ConsentButton
					action="reject-consent"
					variant={isPrimary ? 'primary' : 'neutral'}
					closeConsentBanner
					closeConsentDialog
					class={actionClassName}
					data-testid="consent-widget-reject-button"
				>
					{translations.common.rejectAll}
				</ConsentButton>
			{:else if action === 'accept'}
				<ConsentButton
					action="accept-consent"
					variant={isPrimary ? 'primary' : 'neutral'}
					closeConsentBanner
					closeConsentDialog
					class={actionClassName}
					data-testid="consent-widget-footer-accept-all-button"
				>
					{translations.common.acceptAll}
				</ConsentButton>
			{:else if action === 'customize'}
				<ConsentButton
					action="custom-consent"
					variant={isPrimary ? 'primary' : 'neutral'}
					closeConsentDialog
					class={actionClassName}
					data-testid="consent-widget-footer-save-button"
				>
					{translations.common.save}
				</ConsentButton>
			{/if}
		{/snippet}
	</PolicyActionsRenderer>

	<Branding
		{hideBranding}
		{noStyle}
		variant="dialog-tag"
		themeKey="consentWidgetTag"
		data-testid="consent-widget-branding"
	/>
</div>
