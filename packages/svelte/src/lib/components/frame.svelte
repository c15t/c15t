<script lang="ts">
	import type { AllConsentNames } from '@c15t/core';
	import { defaultTranslationConfig } from '@c15t/core';
	import styles from '@c15t/ui/styles/components/frame';
	import { resolveTranslations } from '@c15t/ui/utils';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';

	import { getConsentContext, getThemeContext } from '../context.svelte';
	import ConsentButton from './consent-button.svelte';

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
	const hasConsent = $derived(consent.state.consents[category] ?? false);

	const translations = $derived(
		resolveTranslations(
			consent.state.translationConfig,
			defaultTranslationConfig
		)
	);
	const frameTitle = $derived(
		(
			translations.frame?.title ??
			'Accept {category} consent to view this content.'
		).replace(
			'{category}',
			translations.consentTypes?.[category]?.title ?? (category as string)
		)
	);
	const frameActionButton = $derived(
		(translations.frame?.actionButton ?? 'Enable {category} consent').replace(
			'{category}',
			translations.consentTypes?.[category]?.title ?? (category as string)
		)
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
		<div
			class={noStyle ? '' : styles.placeholder || ''}
			data-testid="frame-placeholder"
		>
			<div class={noStyle ? '' : styles.title || ''}>{frameTitle}</div>
			<ConsentButton
				action="open-consent-dialog"
				variant="primary"
				mode="stroke"
				size="small"
				{noStyle}
				data-testid="frame-open-dialog"
			>
				{frameActionButton}
			</ConsentButton>
		</div>
	{/if}
</div>
