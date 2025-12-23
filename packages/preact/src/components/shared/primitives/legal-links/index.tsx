import { legalLinksStyles } from '@c15t/styles/primitives/legal-links/css';
import type { AllThemeKeys } from '@c15t/styles/types';
import type { LegalLinks as LegalLinksType } from 'c15t';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useStyles } from '~/hooks/use-styles';
import { useTranslations } from '~/hooks/use-translations';
import type { BoxProps } from '../box';

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
export function LegalLinks({
	links,
	themeKey,
	testIdPrefix,
}: InlineLegalLinksProps) {
	const filteredLinks = useFilteredLegalLinks(links);
	const { legalLinks: t } = useTranslations();
	const linkStyles = useStyles(`${themeKey}.link` as AllThemeKeys, {
		baseClassName: legalLinksStyles.legalLink,
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
 * These are the only allowed parent keys that have corresponding `.link` child keys defined in the theme.
 *
 * @public
 */
export type LegalLinksThemeKey =
	| 'banner.header.legal-links'
	| 'widget.legal-links'
	| 'dialog.legal-links';

export interface LegalLinksProps extends Omit<BoxProps, 'themeKey'> {
	/**
	 * Controls which legal links to display.
	 *
	 * - `undefined` (default): Shows no legal links
	 * - `null`: Shows no legal links
	 * - Array of keys: Shows only the specified legal links
	 *
	 * @defaultValue undefined
	 *
	 * @example
	 * ```tsx
	 * // Show no links (default)
	 * <LegalLinks themeKey="banner.header.legal-links" />
	 *
	 * // Show no links (explicit)
	 * <LegalLinks links={null} themeKey="banner.header.legal-links" />
	 *
	 * // Show only privacy policy
	 * <LegalLinks links={['privacyPolicy']} themeKey="banner.header.legal-links" />
	 * ```
	 *
	 * @remarks
	 * You must set the legal links in the ConsentManagerProvider options.
	 */
	links?: (keyof LegalLinksType)[] | null;

	/** Theme key for styling the component. Must be one of the valid legal-links parent keys. */
	themeKey: LegalLinksThemeKey;
}
