<script lang="ts">
import styles from '@c15t/ui/styles/components/frame.module.js';
import { buttonVariants } from '@c15t/ui/styles/primitives';
import { resolveTranslations } from '@c15t/ui/utils';
import type { AllConsentNames } from 'c15t';
import { defaultTranslationConfig } from 'c15t';
import type { Snippet } from 'svelte';
import { onMount, untrack } from 'svelte';
import { getConsentContext, getThemeContext } from '../context.svelte';

const btn = buttonVariants({
	variant: 'primary',
	mode: 'stroke',
	size: 'small',
});

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
	resolveTranslations(consent.state.translationConfig, defaultTranslationConfig)
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
		category as string
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

// Register category reactively so prop changes and concurrent mounts
// always read the latest consentCategories from the store.
$effect(() => {
	const cat = category;
	untrack(() => {
		const categories = consent.state.consentCategories;
		if (!categories.includes(cat)) {
			consent.state.updateConsentCategories([...categories, cat]);
		}
	});
});

function openDialog() {
	consent.state.setActiveUI('dialog');
}
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
		<div class={noStyle ? '' : styles.placeholder || ''} data-testid="frame-placeholder">
			<div class={noStyle ? '' : styles.title || ''}>
				{frameTitle}
			</div>
			<button
				type="button"
				class={noStyle ? '' : btn.root()}
				onclick={openDialog}
				data-testid="frame-open-dialog"
			>
				{frameActionButton}
			</button>
		</div>
	{/if}
</div>
