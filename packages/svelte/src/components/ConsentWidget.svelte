<script lang="ts">
	import { Accordion } from '@ark-ui/svelte/accordion';
	import { Switch } from '@ark-ui/svelte/switch';
	import { accordionVariants, switchVariants } from '@c15t/ui/styles/primitives';
	import styles from '@c15t/ui/styles/components/consent-widget.module.js';
	import dialogStyles from '@c15t/ui/styles/components/consent-dialog.module.js';
	import { getTextDirection, resolveTranslations } from '@c15t/ui/utils';
	import type { AllConsentNames } from 'c15t';
	import { defaultTranslationConfig } from 'c15t';
	import { getConsentContext, getThemeContext, getTrackingContext, setTrackingContext } from '../context.svelte';
	import { resolveComponentStyles } from '../utils';
	import ConsentButton from './ConsentButton.svelte';
	import C15TIcon from './icons/C15TIcon.svelte';
	import ConsentIconOnly from './icons/ConsentIconOnly.svelte';

	const sw = switchVariants();
	const av = accordionVariants();

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

	let openItems = $state<string[]>([]);

	function toggleConsent(name: string, checked: boolean) {
		consent.state.setSelectedConsent(name as any, checked);
	}

	function formatConsentName(name: AllConsentNames): string {
		return (name as string)
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (c: string) => c.toUpperCase());
	}

	// Per-element theme key resolution
	const widgetRootStyle = $derived(
		resolveComponentStyles('consentWidget', theme.theme, { className, noStyle }, noStyle)
	);

	const footerStyle = $derived(
		resolveComponentStyles('consentWidgetFooter', theme.theme, { baseClassName: styles.footer, noStyle }, noStyle)
	);

	const footerGroupStyle = $derived(
		resolveComponentStyles('consentWidgetFooter', theme.theme, { baseClassName: styles.footerGroup, noStyle }, noStyle)
	);

	// Branding
	const branding = $derived(consent.state.branding);
	const showBranding = $derived(!hideBranding && branding !== 'none');
	const brandingHref = $derived.by(() => {
		const refParam =
			typeof window !== 'undefined' ? `?ref=${window.location.hostname}` : '';
		return branding === 'consent'
			? `https://consent.io${refParam}`
			: `https://c15t.com${refParam}`;
	});
</script>

<div
	class={noStyle ? className : `${widgetRootStyle.className || ''} ${styles.root || ''} ${className || ''}`}
	dir={textDirection}
	data-testid="consent-widget"
>
	<!-- Accordion: consent type list -->
	<Accordion.Root
		class={noStyle ? '' : [av.root(), styles.accordion].filter(Boolean).join(' ')}
		multiple
		bind:value={openItems}
		data-testid="consent-widget-accordion"
	>
		{#each displayedConsents as consentType}
			{@const isChecked =
				consent.state.selectedConsents?.[consentType.name] ??
				consent.state.consents[consentType.name] ??
				false}
			{@const isDisabled = consentType.disabled ?? false}

			<Accordion.Item
				class={noStyle ? '' : av.item({ class: styles.accordionItem })}
				value={consentType.name}
				data-testid={`consent-widget-item-${consentType.name}`}
			>
				<div class={noStyle ? '' : styles.accordionTrigger || ''}>
					<Accordion.ItemTrigger
						class={noStyle ? '' : av.trigger({ class: styles.accordionTriggerInner })}
						data-testid={`consent-widget-trigger-${consentType.name}`}
					>
						<span class={noStyle ? '' : av.arrowOpen({ class: styles.accordionArrowIcon })}>
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M5 12h14M12 5v14" />
							</svg>
						</span>
						<span class={noStyle ? '' : av.arrowClose({ class: styles.accordionArrowIcon })}>
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M5 12h14" />
							</svg>
						</span>
						{translations.consentTypes[consentType.name]?.title ?? formatConsentName(consentType.name)}
					</Accordion.ItemTrigger>

					<!-- Toggle switch -->
					<Switch.Root
						checked={isChecked}
						onCheckedChange={(details) => toggleConsent(consentType.name, details.checked)}
						disabled={isDisabled}
						class={noStyle ? '' : sw.root({ class: styles.switch })}
						data-testid={`consent-widget-switch-${consentType.name}`}
					>
						<Switch.Control class={noStyle ? '' : sw.track({ disabled: isDisabled })}>
							<Switch.Thumb class={noStyle ? '' : sw.thumb({ disabled: isDisabled })} />
						</Switch.Control>
						<Switch.HiddenInput />
					</Switch.Root>
				</div>

				<Accordion.ItemContent
					class={noStyle ? '' : av.content({ class: styles.accordionContent })}
					data-testid={`consent-widget-content-${consentType.name}`}
				>
					<div class={noStyle ? '' : av.contentInner()}>
						<p>{translations.consentTypes[consentType.name]?.description ?? consentType.description ?? ''}</p>
					</div>
				</Accordion.ItemContent>
			</Accordion.Item>
		{/each}
	</Accordion.Root>

	<!-- Footer with action buttons -->
	<div
		class={noStyle ? '' : footerStyle.className || ''}
		data-testid="consent-widget-footer"
	>
		<div class={noStyle ? '' : footerGroupStyle.className || ''}>
			<ConsentButton
				action="reject-consent"
				variant="neutral"
				closeConsentBanner
				closeConsentDialog
				data-testid="consent-widget-reject-button"
			>
				{#snippet children()}
					{translations.common.rejectAll}
				{/snippet}
			</ConsentButton>
			<ConsentButton
				action="accept-consent"
				variant="neutral"
				closeConsentBanner
				closeConsentDialog
				data-testid="consent-widget-accept-all-button"
			>
				{#snippet children()}
					{translations.common.acceptAll}
				{/snippet}
			</ConsentButton>
		</div>
		<ConsentButton
			action="custom-consent"
			variant="primary"
			closeConsentDialog
			data-testid="consent-widget-save-button"
		>
			{#snippet children()}
				{translations.common.save}
			{/snippet}
		</ConsentButton>
	</div>

	<!-- Branding -->
	{#if showBranding}
		<div
			class={noStyle ? '' : dialogStyles.footer || ''}
			data-testid="consent-widget-branding"
		>
			<a
				dir="ltr"
				class={noStyle ? '' : dialogStyles.branding || ''}
				href={brandingHref}
			>
				Secured by
				{#if branding === 'consent'}
					<ConsentIconOnly class={dialogStyles.brandingConsent || ''} />
				{:else}
					<C15TIcon class={dialogStyles.brandingC15T || ''} />
				{/if}
			</a>
		</div>
	{/if}
</div>
