<script lang="ts">
	import type { AllConsentNames } from '@c15t/core';
	import { defaultTranslationConfig } from '@c15t/core';
	import styles from '@c15t/ui/styles/components/consent-gate';
	import { resolveTranslations } from '@c15t/ui/utils';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';

	import { getConsentContext, getThemeContext } from '../context.svelte';
	import { FIRST_PAINT_SHEETS } from '../surface-styles';
	import { resolveComponentStyles, toStyleAttribute } from '../utils';
	import ConsentButton from './action-button.svelte';
	import SurfaceStyles from './surface-styles.svelte';

	let {
		category,
		children,
		placeholder,
		noStyle: localNoStyle,
		class: className,
	}: {
		category: AllConsentNames;
		children?: Snippet;
		placeholder?: Snippet;
		noStyle?: boolean;
		class?: string;
	} = $props();

	const consent = getConsentContext();
	const theme = getThemeContext();

	const noStyle = $derived(localNoStyle ?? theme.noStyle ?? false);
	const hasConsent = $derived(
		consent.state.effectivePermissions[category] ?? false
	);

	const translations = $derived(
		resolveTranslations(
			consent.state.translationConfig,
			defaultTranslationConfig
		)
	);
	const gateTitle = $derived(
		(
			translations.consentGate?.title ??
			'Accept {category} consent to view this content.'
		).replace(
			'{category}',
			translations.consentTypes?.[category]?.title ?? (category as string)
		)
	);
	const gateActionButton = $derived(
		(
			translations.consentGate?.actionButton ?? 'Enable {category} consent'
		).replace(
			'{category}',
			translations.consentTypes?.[category]?.title ?? (category as string)
		)
	);

	const placeholderStyle = $derived(
		resolveComponentStyles(
			'consentGate',
			theme.theme,
			{ baseClassName: styles.placeholder, noStyle },
			noStyle
		)
	);
	const titleStyle = $derived(
		resolveComponentStyles(
			'consentGateTitle',
			theme.theme,
			{ baseClassName: styles.title, noStyle },
			noStyle
		)
	);
	// Goes on top of `buttonPrimary`. The button applies that slot's class
	// itself, but a `style` passed here replaces its style attribute, so the
	// two slot styles are merged first.
	const buttonStyle = $derived(
		resolveComponentStyles(
			'consentGateButton',
			theme.theme,
			{ noStyle },
			noStyle
		)
	);
	const buttonStyleAttribute = $derived(
		toStyleAttribute({
			...resolveComponentStyles(
				'buttonPrimary',
				theme.theme,
				{ noStyle },
				noStyle
			).style,
			...buttonStyle.style,
		})
	);

	let isMounted = $state(false);
	let isReady = $state(false);

	onMount(() => {
		isMounted = true;
		requestAnimationFrame(() => {
			isReady = true;
		});
	});
</script>

<div class={className}>
	{#if !isMounted || !isReady}
		<!-- Prevent FOUC: show nothing until ready -->
	{:else if hasConsent}
		{#if children}
			{@render children()}
		{/if}
	{:else if placeholder}
		{@render placeholder()}
	{:else}
		<!-- Default placeholder -->
		<SurfaceStyles
			sheets={FIRST_PAINT_SHEETS}
			{noStyle}
		/>
		<div
			class={placeholderStyle.className || ''}
			style={toStyleAttribute(placeholderStyle.style)}
			data-testid="consent-gate-placeholder"
		>
			<div
				class={titleStyle.className || ''}
				style={toStyleAttribute(titleStyle.style)}
				data-testid="consent-gate-title"
			>
				{gateTitle}
			</div>
			<ConsentButton
				action="open-consent-dialog"
				variant="primary"
				mode="stroke"
				size="small"
				{noStyle}
				class={buttonStyle.className}
				style={buttonStyleAttribute}
				data-testid="consent-gate-button"
			>
				{gateActionButton}
			</ConsentButton>
		</div>
	{/if}
</div>
