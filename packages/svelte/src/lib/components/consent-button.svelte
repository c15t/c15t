<script lang="ts">
	import type { AllConsentNames } from '@c15t/core';
	import buttonStyles from '@c15t/ui/styles/components/button';
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	import { getConsentContext, getThemeContext } from '../context.svelte';
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
	}: Omit<HTMLButtonAttributes, 'class'> & {
		action:
			| 'accept-consent'
			| 'reject-consent'
			| 'custom-consent'
			| 'dismiss-notice'
			| 'open-consent-dialog'
			| 'set-consent';
		variant?: 'primary' | 'neutral';
		mode?: 'filled' | 'stroke' | 'lighter' | 'ghost';
		size?: 'medium' | 'small' | 'xsmall' | 'xxsmall';
		children?: Snippet;
		closeConsentBanner?: boolean;
		closeConsentDialog?: boolean;
		category?: AllConsentNames;
		noStyle?: boolean;
		class?: string;
	} = $props();

	const consent = getConsentContext();
	const theme = getThemeContext();

	const noStyle = $derived(localNoStyle ?? theme.noStyle ?? false);

	const defaultThemeKey = $derived(
		variant === 'primary'
			? ('buttonPrimary' as const)
			: ('buttonSecondary' as const)
	);

	const variantClasses = $derived(noStyle ? '' : buttonStyles.button);

	const buttonStyle = $derived(
		resolveComponentStyles(
			defaultThemeKey,
			theme.theme,
			{ className, noStyle },
			noStyle
		)
	);

	const handleClick = async function handleClick(
		e: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
	) {
		onclick?.(e);
		if (e.defaultPrevented) {
			return;
		}
		const { state } = consent;
		switch (action) {
			case 'accept-consent':
				await state.saveConsents('all');
				return;
			case 'reject-consent':
				await state.saveConsents('necessary');
				return;
			case 'custom-consent':
				await state.saveConsents('custom');
				return;
			case 'dismiss-notice':
				await state.dismissNotice();
				break;
			case 'open-consent-dialog':
				state.setActiveUI('dialog');
				return;
			case 'set-consent':
				if (category) {
					state.setSelectedConsent(category, true);
				}
				return;
			default:
				return;
		}
		if (closeConsentBanner || closeConsentDialog) {
			state.setActiveUI('none');
		}
	};
</script>

<button
	type="button"
	class={[variantClasses, buttonStyle.className].filter(Boolean).join(' ')}
	data-variant={noStyle ? undefined : variant}
	data-mode={noStyle ? undefined : mode}
	data-size={noStyle ? undefined : size}
	style={buttonStyle.style
		? Object.entries(buttonStyle.style)
				.map(([k, v]) => `${k}:${v}`)
				.join(';')
		: undefined}
	{...restProps}
	onclick={handleClick}
>
	{#if children}
		{@render children()}
	{/if}
</button>
