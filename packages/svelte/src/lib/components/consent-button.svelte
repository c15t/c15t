<script lang="ts">
import { buttonVariants } from '@c15t/ui/styles/primitives';
import type { AllConsentNames } from 'c15t';
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

const variantClasses = $derived(
	noStyle ? '' : buttonVariants({ variant, mode, size }).root()
);

const buttonStyle = $derived(
	resolveComponentStyles(
		defaultThemeKey,
		theme.theme,
		{ className, noStyle },
		noStyle
	)
);

function handleClick(
	e: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
) {
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
		switch (action) {
			case 'accept-consent':
				state.saveConsents('all');
				break;
			case 'reject-consent':
				state.saveConsents('necessary');
				break;
			case 'custom-consent':
				state.saveConsents('custom');
				break;
			case 'set-consent':
				if (!category) {
					console.error('[c15t] Category is required for set-consent action');
					return;
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
	{...restProps}
	onclick={handleClick}
>
	{#if children}
		{@render children()}
	{/if}
</button>
