import styles from '@c15t/ui/styles/v3/legal-links';
import { resolveTranslations } from '@c15t/ui/utils';
import type { LegalLinks as LegalLinksType } from 'c15t';
import { useContext, useMemo, useSyncExternalStore } from 'react';
import { KernelContext } from '~/v3/context';
import { useUIConfig, V3UIConfigContext } from '~/v3/ui-config-context';
import { defaultTranslationConfig } from '~/v3/utils/default-translation-config';
import { mergeSlotProps } from '~/v3/utils/merge-slot-props';

const noopSubscribe = () => () => undefined;

function useLegalLinksConfig(): LegalLinksType | undefined {
	const v3Config = useContext(V3UIConfigContext);
	return v3Config.legalLinks;
}

function useLegalLinkTranslations(): Record<string, string> | undefined {
	const kernel = useContext(KernelContext);
	const kernelTranslations = useSyncExternalStore(
		kernel ? (listener) => kernel.subscribe(listener) : noopSubscribe,
		() => kernel?.getSnapshot().translations ?? null,
		() => kernel?.getSnapshot().translations ?? null
	);

	return useMemo(() => {
		if (kernelTranslations?.translations) {
			const translations = kernelTranslations.translations as Partial<
				NonNullable<typeof defaultTranslationConfig.translations.en>
			>;
			return translations.legalLinks;
		}

		return resolveTranslations({}, defaultTranslationConfig).legalLinks;
	}, [kernelTranslations]);
}

/**
 * Hook to filter legal links based on the provided links prop.
 *
 * @param links - Controls which legal links to display
 * @returns Filtered legal links object or null
 */
export function useFilteredLegalLinks(
	links?: (keyof LegalLinksType)[] | null
): LegalLinksType | null {
	const legalLinks = useLegalLinksConfig();

	// Show no links by default or if explicitly null
	if (links === undefined || links === null) {
		return null;
	}

	// Show only specified links
	const entries = Object.entries(legalLinks ?? {});
	const filtered = entries.filter(([key]) =>
		links.includes(key as keyof LegalLinksType)
	);
	return Object.fromEntries(filtered) as LegalLinksType;
}

/**
 * Props for the InlineLegalLinks component.
 */
export interface InlineLegalLinksProps {
	/**
	 * Controls which legal links to display.
	 *
	 * - `undefined` (default): Shows no legal links
	 * - `null`: Shows no legal links
	 * - Array of keys: Shows only the specified legal links
	 */
	links?: (keyof LegalLinksType)[] | null;

	context: LegalLinksContext;

	/**
	 * Optional test ID prefix for the links.
	 * Links will have test IDs like `${testIdPrefix}-${type}`
	 */
	testIdPrefix?: string;
}

/**
 * Renders legal links inline with commas and spaces.
 * The comma is part of the link (styled), but the space after is not.
 *
 * @example
 * ```tsx
 * <InlineLegalLinks
 *   links={['privacyPolicy', 'cookiePolicy']}
 *   context="dialog"
 *   testIdPrefix="consent-manager-dialog-legal-link"
 * />
 * ```
 */
export function InlineLegalLinks({
	links,
	context,
	testIdPrefix,
}: InlineLegalLinksProps) {
	const filteredLinks = useFilteredLegalLinks(links);
	const t = useLegalLinkTranslations();
	const { components } = useUIConfig();
	const rootStyles = mergeSlotProps(components?.['legal-links']?.root, {});
	const linkStyles = mergeSlotProps(components?.link?.[context], {
		baseClassName: styles.legalLink,
	});

	if (!filteredLinks || Object.keys(filteredLinks).length === 0) {
		return null;
	}

	return (
		<span {...rootStyles}>
			{' '}
			{(
				Object.entries(filteredLinks) as [
					keyof LegalLinksType,
					LegalLinksType[keyof LegalLinksType],
				][]
			).map(([type, link], index, array) => {
				if (!link) return null;
				return (
					<span key={String(type)}>
						<a
							href={link.href}
							target={link.target || '_blank'}
							rel={
								link.rel ||
								(link.target === '_blank' ? 'noopener noreferrer' : undefined)
							}
							{...linkStyles}
							data-testid={testIdPrefix ? `${testIdPrefix}-${type}` : undefined}
						>
							{link.label ?? (t as Record<string, string>)?.[type as string]}
							{index < array.length - 1 && ','}
						</a>
						{index < array.length - 1 && ' '}
					</span>
				);
			})}
		</span>
	);
}

/**
 * Valid link slot contexts for inline legal links.
 */
type LegalLinksContext = 'banner' | 'dialog' | 'manager';
