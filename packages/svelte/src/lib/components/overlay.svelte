<script lang="ts">
	import { getThemeContext } from '../context.svelte';
	import { resolveComponentStyles } from '../utils';

	/**
	 * The overlay class names from the caller's own style map. The overlay
	 * imports none itself, so a page with only the banner does not ship the
	 * dialog or IAB class maps (and, where a class map imports its CSS, their
	 * stylesheets).
	 */
	interface OverlayStyles {
		overlay?: string;
		overlayVisible?: string;
		overlayHidden?: string;
	}

	let {
		styles,
		variant = 'banner',
		visible = true,
	}: {
		styles: OverlayStyles;
		variant?: 'banner' | 'dialog' | 'iab-banner' | 'iab-dialog';
		visible?: boolean;
	} = $props();

	const theme = getThemeContext();

	const themeKey = $derived.by(() => {
		if (variant === 'dialog') {
			return 'consentDialogOverlay' as const;
		}
		if (variant === 'iab-dialog') {
			return 'iabConsentDialogOverlay' as const;
		}
		return variant === 'iab-banner'
			? ('iabConsentBannerOverlay' as const)
			: ('consentBannerOverlay' as const);
	});

	const testId = $derived.by(() => {
		if (variant === 'dialog') {
			return 'consent-dialog-overlay';
		}
		if (variant === 'iab-dialog') {
			return 'iab-consent-dialog-overlay';
		}
		return variant === 'iab-banner'
			? 'iab-consent-banner-overlay'
			: 'consent-banner-overlay';
	});

	const themeStyle = $derived(
		resolveComponentStyles(
			themeKey,
			theme.theme,
			{ baseClassName: styles.overlay },
			theme.noStyle
		)
	);

	const className = $derived(
		theme.noStyle
			? themeStyle.className || ''
			: `${themeStyle.className || ''} ${visible ? styles.overlayVisible : styles.overlayHidden}`
	);
</script>

<div
	class={className}
	style={themeStyle.style
		? Object.entries(themeStyle.style)
				.map(([k, v]) => `${k}:${v}`)
				.join(';')
		: undefined}
	data-testid={testId}
	aria-hidden="true"
></div>
