<script lang="ts">
	import type { AllConsentNames } from '@c15t/core';
	import { defaultTranslationConfig } from '@c15t/core';
	import accordionStyles from '@c15t/ui/styles/components/accordion';
	import managerStyles from '@c15t/ui/styles/components/consent-manager';
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

	import { getConsentContext, getThemeContext } from '../context.svelte';
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

	const noStyle = $derived(localNoStyle ?? theme.noStyle ?? false);

	const translations = $derived(
		resolveTranslations(
			consent.state.translationConfig,
			defaultTranslationConfig
		)
	);

	const textDirection = $derived(
		getTextDirection(consent.state.translationConfig?.defaultLanguage)
	);

	const displayedConsents = $derived(
		consent.state.consentTypes.filter((ct) =>
			consent.state.consentCategories.includes(ct.name)
		)
	);

	let openItems = $state<Record<string, boolean>>({});

	const toggleConsent = function toggleConsent(name: string, checked: boolean) {
		consent.state.setSelectedConsent(name as AllConsentNames, checked);
	};

	const toggleOpenItem = function toggleOpenItem(name: string) {
		const nextOpen = !(openItems[name] ?? false);
		openItems = Object.fromEntries(
			displayedConsents.map((consentType) => [
				consentType.name,
				nextOpen && consentType.name === name,
			])
		);
	};

	const formatConsentName = function formatConsentName(
		name: AllConsentNames
	): string {
		return (name as string)
			.replace(/_/gu, ' ')
			.replace(/\b\w/gu, (c: string) => c.toUpperCase());
	};

	// Per-element theme key resolution
	const widgetRootStyle = $derived(
		resolveComponentStyles(
			'consentWidget',
			theme.theme,
			{ baseClassName: managerStyles.manager, className },
			noStyle
		)
	);

	const footerStyle = $derived(
		resolveComponentStyles(
			'consentWidgetFooter',
			theme.theme,
			{ baseClassName: managerStyles.footer, noStyle },
			noStyle
		)
	);

	const footerGroupStyle = $derived(
		resolveComponentStyles(
			'consentWidgetFooter',
			theme.theme,
			{ noStyle },
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
			actionGroups,
			direction,
			uiProfile: consent.state.policyDialog.uiProfile,
		})
	);
</script>

<div
	class={noStyle ? className : widgetRootStyle.className || ''}
	dir={textDirection}
	data-testid="consent-widget-root"
>
	<div
		class={noStyle ? '' : accordionStyles.list || ''}
		data-testid="consent-widget-accordion"
	>
		{#each displayedConsents as consentType (consentType.name)}
			{@const isOpen = openItems[consentType.name] ?? false}
			{@const isChecked =
				consent.state.selectedConsents?.[consentType.name] ??
				consent.state.consents[consentType.name] ??
				false}
			{@const isDisabled = consentType.disabled ?? false}
			<PreferenceItem.Root
				class={noStyle ? '' : accordionStyles.item || ''}
				open={isOpen}
				noStyle
				data-testid={`consent-widget-accordion-item-${consentType.name}`}
			>
				<div class={noStyle ? '' : accordionStyles.triggerRow || ''}>
					<PreferenceItem.Trigger
						class={noStyle ? '' : accordionStyles.trigger || ''}
						onclick={() => toggleOpenItem(consentType.name)}
						data-testid={`consent-widget-accordion-trigger-${consentType.name}`}
					>
						<PreferenceItem.Leading
							class={noStyle ? '' : accordionStyles.arrow || ''}
							data-testid={`consent-widget-accordion-arrow-${consentType.name}`}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<title>{isOpen ? 'Close' : 'Open'}</title>
								{#if isOpen}
									<path d="M5 12h14" />
								{:else}
									<path d="M5 12h14M12 5v14" />
								{/if}
							</svg>
						</PreferenceItem.Leading>
						<PreferenceItem.Header>
							<PreferenceItem.Title
								class={noStyle ? '' : accordionStyles.title || ''}
							>
								{translations.consentTypes[consentType.name]?.title ??
									formatConsentName(consentType.name)}
							</PreferenceItem.Title>
						</PreferenceItem.Header>
					</PreferenceItem.Trigger>

					<PreferenceItem.Control
						class={noStyle ? '' : accordionStyles.control || ''}
					>
						<Switch.Root
							aria-label={translations.consentTypes[consentType.name]?.title ??
								formatConsentName(consentType.name)}
							checked={isChecked}
							onclick={() => toggleConsent(consentType.name, !isChecked)}
							disabled={isDisabled}
							class={noStyle ? '' : sw.root()}
							data-testid={`consent-widget-switch-${consentType.name}`}
						>
							<Switch.Control
								class={noStyle ? '' : sw.track({ disabled: isDisabled })}
							>
								<Switch.Thumb
									class={noStyle ? '' : sw.thumb({ disabled: isDisabled })}
								/>
							</Switch.Control>
						</Switch.Root>
					</PreferenceItem.Control>
				</div>

				<PreferenceItem.Content
					class={noStyle ? '' : accordionStyles.content || ''}
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
		{actionGroups}
		{primaryActions}
		{shouldFillActions}
		{direction}
		{noStyle}
		footerClassName={noStyle ? '' : footerStyle.className || ''}
		footerSubGroupClassName={noStyle ? '' : footerGroupStyle.className || ''}
		footerTestId="consent-widget-footer"
		footerSubGroupTestId="consent-widget-footer-sub-group"
	>
		{#snippet renderAction(action: string, isPrimary: boolean)}
			{#if action === 'reject'}
				<ConsentButton
					action="reject-consent"
					variant={isPrimary ? 'primary' : 'neutral'}
					closeConsentBanner
					closeConsentDialog
					data-action="reject"
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
					data-action="accept"
					data-testid="consent-widget-footer-accept-all-button"
				>
					{translations.common.acceptAll}
				</ConsentButton>
			{:else if action === 'customize'}
				<ConsentButton
					action="custom-consent"
					variant={isPrimary ? 'primary' : 'neutral'}
					closeConsentDialog
					data-action="customize"
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
