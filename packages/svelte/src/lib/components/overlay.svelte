<script lang="ts">
import bannerStyles from '@c15t/ui/styles/components/consent-banner.module.js';
import dialogStyles from '@c15t/ui/styles/components/consent-dialog.module.js';
import { getThemeContext } from '../context.svelte';
import { resolveComponentStyles } from '../utils';

let {
	variant = 'banner',
	visible = true,
}: {
	variant?: 'banner' | 'dialog';
	visible?: boolean;
} = $props();

const theme = getThemeContext();

const styles = $derived(variant === 'dialog' ? dialogStyles : bannerStyles);

const themeKey = $derived(
	variant === 'dialog'
		? ('consentDialogOverlay' as const)
		: ('consentBannerOverlay' as const)
);

const testId = $derived(
	variant === 'dialog' ? 'consent-dialog-overlay' : 'consent-banner-overlay'
);

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
