<script lang="ts">
	import { buttonVariants } from '@c15t/ui/styles/primitives';
	import type { AllConsentNames } from 'c15t';
	import type { Snippet } from 'svelte';
	import { getConsentContext, getThemeContext, getTrackingContext } from '../context.svelte';
	import { resolveComponentStyles } from '../utils';

	let {
		action,
		variant = 'neutral',
		mode = 'stroke',
		size = 'small',
		children,
		onclick,
		closeConsentBanner = false,
		closeConsentDialog = false,
		category,
		noStyle: localNoStyle,
		class: className,
		...restProps
	}: {
		action:
			| 'accept-consent'
			| 'reject-consent'
			| 'custom-consent'
			| 'open-consent-dialog'
			| 'set-consent';
		variant?: 'primary' | 'neutral';
		mode?: 'filled' | 'stroke' | 'lighter' | 'ghost';
		size?: 'medium' | 'small' | 'xsmall' | 'xxsmall';
		children?: Snippet;
		onclick?: (e: MouseEvent) => void;
		closeConsentBanner?: boolean;
		closeConsentDialog?: boolean;
		category?: AllConsentNames;
		noStyle?: boolean;
		class?: string;
		'data-testid'?: string;
		[key: string]: unknown;
	} = $props();

	const consent = getConsentContext();
	const theme = getThemeContext();
	const tracking = getTrackingContext();

	const noStyle = $derived(localNoStyle ?? theme.noStyle ?? false);

	const defaultThemeKey = $derived(
		variant === 'primary' ? 'buttonPrimary' : 'buttonSecondary'
	);

	const variantClasses = $derived(
		noStyle ? '' : buttonVariants({ variant, mode, size }).root()
	);

	const buttonStyle = $derived(
		resolveComponentStyles(
			defaultThemeKey as any,
			theme.theme,
			{ className, noStyle },
			noStyle
		)
	);

	function handleClick(e: MouseEvent) {
		const { state } = consent;

		// Handle UI state changes first
		if (closeConsentBanner || closeConsentDialog) {
			state.setActiveUI('none');
		}

		if (action === 'open-consent-dialog') {
			state.setActiveUI('dialog');
		}

		// Call forwarded click handler
		onclick?.(e);

		if (action !== 'open-consent-dialog') {
			const consentOptions = tracking.uiSource ? { uiSource: tracking.uiSource } : undefined;
			switch (action) {
				case 'accept-consent':
					state.saveConsents('all', consentOptions);
					break;
				case 'reject-consent':
					state.saveConsents('necessary', consentOptions);
					break;
				case 'custom-consent':
					state.saveConsents('custom', consentOptions);
					break;
				case 'set-consent':
					if (!category) {
						throw new Error('Category is required for set-consent action');
					}
					state.setConsent(category, true);
					break;
			}
		}
	}
</script>

<button
	type="button"
	class={[variantClasses, buttonStyle.className].filter(Boolean).join(' ')}
	style={buttonStyle.style
		? Object.entries(buttonStyle.style)
				.map(([k, v]) => `${k}:${v}`)
				.join(';')
		: undefined}
	onclick={handleClick}
	{...restProps}
>
	{#if children}
		{@render children()}
	{/if}
</button>
