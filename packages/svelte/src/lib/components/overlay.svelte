<script lang="ts">
	import bannerStyles from '@c15t/ui/styles/components/consent-banner';
	import dialogStyles from '@c15t/ui/styles/components/consent-dialog';
	import iabBannerStyles from '@c15t/ui/styles/components/iab-consent-banner';
	import iabDialogStyles from '@c15t/ui/styles/components/iab-consent-dialog';

	import { getThemeContext } from '../context.svelte';
	import { resolveComponentStyles } from '../utils';

	let {
		variant = 'banner',
		visible = true,
	}: {
		variant?: 'banner' | 'dialog' | 'iab-banner' | 'iab-dialog';
		visible?: boolean;
	} = $props();

	const theme = getThemeContext();

	const styles = $derived.by(() => {
		if (variant === 'dialog') {
			return dialogStyles;
		}
		if (variant === 'iab-dialog') {
			return iabDialogStyles;
		}
		return variant === 'iab-banner' ? iabBannerStyles : bannerStyles;
	});

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
