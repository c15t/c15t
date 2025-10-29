import type { LegalLinks as LegalLinksType } from 'c15t';
import { forwardRef } from 'react';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useStyles } from '~/hooks/use-styles';
import { useTranslations } from '~/hooks/use-translations';
import type { AllThemeKeys } from '~/types/theme/style-keys';
import { Box, type BoxProps } from '../box';
import styles from './legal-links.module.css';

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
	 * <LegalLinks themeKey="banner" />
	 *
	 * // Show no links
	 * <LegalLinks links={null} themeKey="banner" />
	 *
	 * // Show only privacy policy
	 * <LegalLinks links={['privacyPolicy']} themeKey="banner" />
	 * ```
	 *
	 * @remarks
	 * You must set the legal links in the ConsentManagerProvider options.
	 */
	links?: (keyof LegalLinksType)[] | null;

	/** Theme key for styling the component */
	themeKey: AllThemeKeys;
}

/**
 * Renders a list of legal links (e.g., privacy policy, cookie policy).
 *
 * @example
 * ```tsx
 * <LegalLinks
 *   links={['privacyPolicy', 'cookiePolicy']}
 *   themeKey="cookieBanner"
 * />
 * ```
 */
export const LegalLinks = forwardRef<HTMLDivElement, LegalLinksProps>(
	({ links, themeKey, ...props }, ref) => {
		const { legalLinks } = useConsentManager();
		const { legalLinks: t } = useTranslations();

		const linkStyles = useStyles(`${themeKey}.link` as AllThemeKeys, {
			baseClassName: styles.legalLink,
		});

		// Filter legalLinks based on the links prop
		const filteredLinks =
			links === null
				? null // Explicitly hide all links
				: links === undefined
					? legalLinks // Show all links (default)
					: (Object.fromEntries(
							Object.entries(legalLinks ?? {}).filter(([key]) =>
								links.includes(key as keyof LegalLinksType)
							)
						) as LegalLinksType); // Show only specified links

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
