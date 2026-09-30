<script lang="ts">
	import type { LegalLinks as LegalLinksType } from '@c15t/core';
	import { defaultTranslationConfig } from '@c15t/core';
	import legalLinkStyles from '@c15t/ui/styles/components/legal-links';
	import { resolveTranslations } from '@c15t/ui/utils';

	import { getConsentContext, getThemeContext } from '../context.svelte';

	// No theme slot: the React and Vue legal links take only the stock link
	// class, and the description's slot belongs to the description.
	let {
		links,
		testIdPrefix,
	}: {
		links?: (keyof LegalLinksType)[] | null;
		testIdPrefix?: string;
	} = $props();

	const consent = getConsentContext();
	const theme = getThemeContext();

	const noStyle = $derived(theme.noStyle ?? false);

	const translations = $derived(
		resolveTranslations(
			consent.state.translationConfig,
			defaultTranslationConfig
		)
	);

	const filteredLinks = $derived.by(() => {
		if (links === undefined || links === null) {
			return null;
		}
		const allLinks = consent.state.legalLinks;
		if (!allLinks) {
			return null;
		}
		const entries = Object.entries(allLinks).filter(([key]) =>
			links.includes(key as keyof LegalLinksType)
		);
		return entries.length > 0
			? (Object.fromEntries(entries) as LegalLinksType)
			: null;
	});

	const linkClassName = $derived(noStyle ? '' : legalLinkStyles.legalLink);

	const linkEntries = $derived(
		filteredLinks
			? (Object.entries(filteredLinks) as [
					keyof LegalLinksType,
					LegalLinksType[keyof LegalLinksType],
				][])
			: []
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
						rel={link.rel ||
							(link.target === '_blank' ? 'noopener noreferrer' : undefined)}
						class={linkClassName || undefined}
						data-testid={testIdPrefix ? `${testIdPrefix}-${type}` : undefined}
					>
						{link.label ??
							(translations.legalLinks as Record<string, string>)?.[
								type as string
							] ??
							type}{index < linkEntries.length - 1 ? ',' : ''}
					</a>
					{#if index < linkEntries.length - 1}
						&nbsp;
					{/if}
				</span>
			{/if}
		{/each}
	</span>
{/if}
