<script lang="ts">
	import { getThemeContext } from '../context.svelte';
	import { resolveComponentStyles, toStyleAttribute } from '../utils';

	/**
	 * The overlay class names from the caller's own style map. The overlay
	 * imports none itself, so a page with only the banner does not ship the
	 * dialog or IAB class maps (and, where a class map imports its CSS, their
	 * stylesheets).
	 */
	interface OverlayStyles {
		overlay?: string;
		overlayVisible?: string;
		overlayEntering?: string;
		overlayHidden?: string;
	}

	let {
		entering,
		lateEntry = false,
		styles,
		variant = 'banner',
		visible = true,
	}: {
		/**
		 * Add the entering class on a visible overlay, which the dialog's
		 * stylesheet fades in from the first frame and the banner's fades in
		 * only with `lateEntry`. Defaults to the theme's animation
		 * setting, so a caller only passes it to override that.
		 */
		entering?: boolean;
		/**
		 * Mark the mount `data-entry="late"`, for a banner that arrives
		 * after the page has painted. The stylesheet fades it in.
		 */
		lateEntry?: boolean;
		styles: OverlayStyles;
		variant?: 'banner' | 'dialog' | 'iab-banner' | 'iab-dialog';
		visible?: boolean;
	} = $props();

	const theme = getThemeContext();
	const shouldEnter = $derived(entering ?? !(theme.disableAnimation ?? false));

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
			: `${themeStyle.className || ''} ${visible ? `${styles.overlayVisible}${shouldEnter && styles.overlayEntering ? ` ${styles.overlayEntering}` : ''}` : styles.overlayHidden}`
	);
</script>

<div
	class={className}
	style={toStyleAttribute(themeStyle.style)}
	data-entry={lateEntry ? 'late' : undefined}
	data-testid={testId}
	aria-hidden="true"
></div>
