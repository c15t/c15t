<script lang="ts">
import styles from '@c15t/ui/styles/components/consent-dialog.module.js';
import { resolveTranslations } from '@c15t/ui/utils';
import { defaultTranslationConfig } from 'c15t';
import { getConsentContext, getThemeContext } from '../context.svelte';
import { resolveComponentStyles } from '../utils';
import C15TIconOnly from './icons/c15-t-icon-only.svelte';
import InthLogo from './icons/inth-logo.svelte';

type ResolvedBranding = 'c15t' | 'inth' | 'none';
type BrandingVariant = 'footer' | 'dialog-tag' | 'banner-tag';
type BrandingThemeKey =
	| 'consentBannerTag'
	| 'consentDialogTag'
	| 'consentWidgetTag'
	| 'iabConsentBannerTag'
	| 'iabConsentDialogTag';

let {
	hideBranding = false,
	noStyle: localNoStyle,
	variant = 'footer',
	themeKey,
	class: className,
	'data-testid': testId,
}: {
	hideBranding?: boolean;
	noStyle?: boolean;
	variant?: BrandingVariant;
	themeKey?: BrandingThemeKey;
	class?: string;
	'data-testid'?: string;
} = $props();

const consent = getConsentContext();
const theme = getThemeContext();

const noStyle = $derived(localNoStyle ?? theme.noStyle ?? false);
const branding = $derived(consent.state.branding);
const translations = $derived(
	resolveTranslations(consent.state.translationConfig, defaultTranslationConfig)
);

function resolveBranding(value: string): ResolvedBranding {
	if (value === 'none') {
		return 'none';
	}

	if (value === 'inth' || value === 'consent') {
		return 'inth';
	}

	return 'c15t';
}

const resolvedBranding = $derived(resolveBranding(branding));
const showBranding = $derived(!hideBranding && resolvedBranding !== 'none');
const brandingHref = $derived.by(() => {
	const refParam =
		typeof window !== 'undefined' ? `?ref=${window.location.hostname}` : '';
	return resolvedBranding === 'inth'
		? `https://inth.com${refParam}`
		: `https://c15t.com${refParam}`;
});

const baseClassName = $derived(
	[
		styles.branding,
		variant !== 'footer' ? styles.brandingTag : '',
		variant === 'dialog-tag' ? styles.brandingTagDialog : '',
		variant === 'banner-tag' ? styles.brandingTagBanner : '',
	]
		.filter(Boolean)
		.join(' ')
);

const brandingStyle = $derived(
	resolveComponentStyles(
		themeKey ?? 'consentDialogTag',
		theme.theme,
		{
			baseClassName,
			className,
		},
		noStyle
	)
);
</script>

{#if showBranding}
	<a
		dir="ltr"
		class={brandingStyle.className || ''}
		href={brandingHref}
		data-branding={resolvedBranding}
		data-variant={variant}
		data-testid={testId}
	>
		<span class={styles.brandingCopy || ''}>
			<span class={styles.brandingText || ''}>{translations.common.securedBy}</span>
		</span>
		{#if resolvedBranding === 'inth'}
			<span dir="ltr" class={`${styles.brandingWordmark || ''} ${styles.brandingInth || ''}`}>
				<InthLogo aria-hidden={true} />
			</span>
		{:else}
			<span dir="ltr" class={`${styles.brandingWordmark || ''} ${styles.brandingC15T || ''}`}>
				<span class={styles.brandingC15TMark || ''}>
					<C15TIconOnly aria-hidden={true} />
				</span>
				<span class={styles.brandingWordmarkLabel || ''}>c15t</span>
			</span>
		{/if}
	</a>
{/if}
