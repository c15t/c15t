import styles from '@c15t/ui/styles/primitives/legal-links.module.js';
import type { LegalLinks as LegalLinksType } from 'c15t';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useStyles } from '~/hooks/use-styles';
import { useTranslations } from '~/hooks/use-translations';
import type { AllThemeKeys } from '~/types/theme/style-keys';

/**
 * Hook to filter legal links based on the provided links prop.
 *
 * @param links - Controls which legal links to display
 * @returns Filtered legal links object or null
 */
export function useFilteredLegalLinks(
	links?: (keyof LegalLinksType)[] | null
): LegalLinksType | null {
	const { legalLinks } = useConsentManager();

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

	/**
	 * Theme key for styling the links. Must be one of the valid legal-links parent keys.
	 */
	themeKey: LegalLinksThemeKey;

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
 *   themeKey="dialog.legal-links"
 *   testIdPrefix="consent-manager-dialog-legal-link"
 * />
 * ```
 */
export function InlineLegalLinks({
	links,
	themeKey,
	testIdPrefix,
}: InlineLegalLinksProps) {
	const filteredLinks = useFilteredLegalLinks(links);
	const { legalLinks: t } = useTranslations();
	const linkStyles = useStyles(themeKey as any, {
		baseClassName: styles.legalLink,
	});

	if (!filteredLinks || Object.keys(filteredLinks).length === 0) {
		return null;
	}

	return (
		<span>
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
 * Valid theme key prefixes for the LegalLinks component.
 */
type LegalLinksThemeKey = AllThemeKeys;
