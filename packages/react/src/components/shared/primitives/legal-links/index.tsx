import type { LegalLinks as LegalLinksType } from 'c15t';
import { forwardRef } from 'react';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useStyles } from '~/hooks/use-styles';
import { useTranslations } from '~/hooks/use-translations';
import type { AllThemeKeys } from '~/types/theme/style-keys';
import { Box, type BoxProps } from '../box';
import styles from './legal-links.module.css';

/**
 * Valid theme key prefixes for the LegalLinks component.
 * These are the only allowed parent keys that have corresponding `.link` child keys defined in the theme.
 */
type LegalLinksThemeKey =
	| 'banner.header.legal-links'
	| 'widget.legal-links'
	| 'dialog.legal-links';

export interface LegalLinksProps extends Omit<BoxProps, 'themeKey'> {
	/**
	 * Controls which legal links to display.
	 *
	 * - `undefined` (default): Shows all available legal links
	 * - `null`: Explicitly hides all legal links
	 * - Array of keys: Shows only the specified legal links
	 *
	 * @defaultValue undefined
	 *
	 * @example
	 * ```tsx
	 * // Show all links
	 * <LegalLinks themeKey="banner.header.legal-links" />
	 *
	 * // Show no links
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

/**
 * Renders a list of legal links (e.g., privacy policy, cookie policy).
 *
 * @example
 * ```tsx
 * <LegalLinks
 *   links={['privacyPolicy', 'cookiePolicy']}
 *   themeKey="banner.header.legal-links"
 * />
 * ```
 */
export const LegalLinks = forwardRef<HTMLDivElement, LegalLinksProps>(
	({ links, themeKey, ...props }, ref) => {
		const { legalLinks } = useConsentManager();
		const { legalLinks: t } = useTranslations();

		// TypeScript now knows that `${themeKey}.link` is valid because
		// all three LegalLinksThemeKey values have corresponding `.link` child keys
		const linkStyles = useStyles(`${themeKey}.link` as AllThemeKeys, {
			baseClassName: styles.legalLink,
		});

		// Filter legalLinks based on the links prop
		const filteredLinks = (() => {
			// Explicitly hide all links
			if (links === null) {
				return null;
			}

			// Show all links (default behavior)
			if (links === undefined) {
				return legalLinks;
			}

			// Show only specified links
			const entries = Object.entries(legalLinks ?? {});
			const filtered = entries.filter(([key]) =>
				links.includes(key as keyof LegalLinksType)
			);
			return Object.fromEntries(filtered) as LegalLinksType;
		})();

		// Don't render if filteredLinks is null or empty
		if (!filteredLinks || Object.keys(filteredLinks).length === 0) {
			return null;
		}

		return (
			<Box
				ref={ref}
				themeKey={themeKey}
				baseClassName={styles.legalLinks}
				{...props}
			>
				{(
					Object.entries(filteredLinks) as [
						keyof LegalLinksType,
						LegalLinksType[keyof LegalLinksType],
					][]
				).map(([type, link]) => {
					if (!link) return null;
					return (
						<a
							key={String(type)}
							href={link.href}
							target={link.target || '_blank'}
							rel={
								link.rel ||
								(link.target === '_blank' ? 'noopener noreferrer' : undefined)
							}
							{...linkStyles}
						>
							{link.label ?? (t as Record<string, string>)?.[type as string]}
						</a>
					);
				})}
			</Box>
		);
	}
);

LegalLinks.displayName = 'LegalLinks';
