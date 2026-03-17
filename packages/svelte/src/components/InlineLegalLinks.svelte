<script lang="ts">
	import legalLinkStyles from '@c15t/ui/styles/primitives/legal-links.module.js';
	import type { AllThemeKeys } from '@c15t/ui/theme';
	import type { LegalLinks as LegalLinksType } from 'c15t';
	import { getConsentContext, getThemeContext } from '../context.svelte';
	import { resolveComponentStyles } from '../utils';
	import { resolveTranslations } from '@c15t/ui/utils';
	import { defaultTranslationConfig } from 'c15t';

	let {
		links,
		themeKey = 'consentBannerDescription' as AllThemeKeys,
		testIdPrefix,
	}: {
		links?: (keyof LegalLinksType)[] | null;
		themeKey?: AllThemeKeys;
		testIdPrefix?: string;
	} = $props();

	const consent = getConsentContext();
	const theme = getThemeContext();

	const noStyle = $derived(theme.noStyle ?? false);

	const translations = $derived(
		resolveTranslations(consent.state.translationConfig, defaultTranslationConfig)
	);

	const filteredLinks = $derived.by(() => {
		if (links === undefined || links === null) {
			return null;
		}
		const allLinks = consent.state.legalLinks;
		if (!allLinks) return null;
		const entries = Object.entries(allLinks).filter(([key]) =>
			links.includes(key as keyof LegalLinksType)
		);
		return entries.length > 0 ? (Object.fromEntries(entries) as LegalLinksType) : null;
	});

	const linkStyle = $derived(
		resolveComponentStyles(
			themeKey,
			theme.theme,
			{ baseClassName: legalLinkStyles.legalLink },
			noStyle
		)
	);

	const linkEntries = $derived(
		filteredLinks ? (Object.entries(filteredLinks) as [keyof LegalLinksType, LegalLinksType[keyof LegalLinksType]][]) : []
	);
</script>

{#if linkEntries.length > 0}
	<span>
		&nbsp;
		{#each linkEntries as [type, link], index (type)}
			{#if link}
				<span>
					<a
						href={link.href}
						target={link.target || '_blank'}
						rel={link.rel || (link.target === '_blank' ? 'noopener noreferrer' : undefined)}
						class={linkStyle.className || ''}
						data-testid={testIdPrefix ? `${testIdPrefix}-${type}` : undefined}
					>
						{link.label ?? (translations.legalLinks as Record<string, string>)?.[type as string] ?? type}{index < linkEntries.length - 1 ? ',' : ''}
					</a>
					{#if index < linkEntries.length - 1}&nbsp;{/if}
				</span>
			{/if}
		{/each}
	</span>
{/if}
