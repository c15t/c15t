<script lang="ts">
	import type { AllConsentNames } from 'c15t';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import styles from '@c15t/ui/styles/components/frame.module.js';
	import { buttonVariants } from '@c15t/ui/styles/primitives';
	import { getConsentContext, getThemeContext } from '../context.svelte';

	const btn = buttonVariants({ variant: 'primary', mode: 'stroke', size: 'small' });

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

	let isMounted = $state(false);
	let isReady = $state(false);

	onMount(() => {
		isMounted = true;

		// Register this consent category
		const categories = consent.state.consentCategories;
		if (!categories.includes(category)) {
			consent.state.updateConsentCategories([...categories, category]);
		}

		requestAnimationFrame(() => {
			isReady = true;
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
				{category} content blocked
			</div>
			<button
				type="button"
				class={noStyle ? '' : btn.root()}
				onclick={openDialog}
				data-testid="frame-open-dialog"
			>
				Manage consent
			</button>
		</div>
	{/if}
</div>
