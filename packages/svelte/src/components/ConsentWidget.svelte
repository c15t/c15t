<script lang="ts">
	import { Accordion } from '@ark-ui/svelte/accordion';
	import { Switch } from '@ark-ui/svelte/switch';
	import { switchVariants } from '@c15t/ui/styles/primitives';
	import styles from '@c15t/ui/styles/components/consent-widget.module.js';
	import { resolveTranslations } from '@c15t/ui/utils';
	import { defaultTranslationConfig } from 'c15t';
	import { getConsentContext, getThemeContext, getTrackingContext, setTrackingContext } from '../context.svelte';
	import ConsentButton from './ConsentButton.svelte';

	const sw = switchVariants();

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

	const displayedConsents = $derived(
		consent.state.consentTypes.filter((ct) =>
			consent.state.consentCategories.includes(ct.name)
		)
	);

	let openItems = $state<string[]>([]);

	function toggleConsent(name: string, checked: boolean) {
		consent.state.setSelectedConsent(name as any, checked);
	}
</script>

<div
	class={noStyle ? className : `${styles.root || ''} ${className || ''}`}
	data-testid="consent-widget"
>
	<!-- Accordion: consent type list -->
	<Accordion.Root
		class={noStyle ? '' : styles.accordion || ''}
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
				class={noStyle ? '' : styles.accordionItem || ''}
				value={consentType.name}
				data-testid={`consent-widget-item-${consentType.name}`}
			>
				<div class={noStyle ? '' : styles.accordionTrigger || ''}>
					<Accordion.ItemTrigger
						class={noStyle ? '' : styles.accordionTriggerInner || ''}
						data-testid={`consent-widget-trigger-${consentType.name}`}
					>
						<Accordion.ItemIndicator
							class={noStyle ? '' : styles.accordionArrow || ''}
						>
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
								<polyline points="6 9 12 15 18 9"></polyline>
							</svg>
						</Accordion.ItemIndicator>
						<span>{consentType.name}</span>
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
					class={noStyle ? '' : styles.accordionContent || ''}
					data-testid={`consent-widget-content-${consentType.name}`}
				>
					<p>{consentType.description ?? ''}</p>
				</Accordion.ItemContent>
			</Accordion.Item>
		{/each}
	</Accordion.Root>

	<!-- Footer with action buttons -->
	<div
		class={noStyle ? '' : styles.footer || ''}
		data-testid="consent-widget-footer"
	>
		<div class={noStyle ? '' : styles.footerGroup || ''}>
			<ConsentButton
				action="reject-consent"
				variant="neutral"
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
</div>
