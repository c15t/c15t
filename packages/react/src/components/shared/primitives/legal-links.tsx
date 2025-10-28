import type { LegalLinksTranslations } from 'c15t';
import { forwardRef, type Ref } from 'react';
import { useTranslations } from '~/hooks/use-translations';
import type { AllThemeKeys } from '~/types/theme/style-keys';
import { Box, type BoxProps } from './box';
import styles from './legal-links.module.css';

/**
 * Configuration for a single legal link (e.g., privacy policy, cookie policy).
 *
 * @example
 * ```typescript
 * const link: LegalLink = {
 *   type: 'privacyPolicy',
 *   href: 'https://example.com/privacy',
 *   target: '_blank'
 * };
 * ```
 */
export interface LegalLink {
	/** Translation key for the link type */
	type: keyof LegalLinksTranslations;
	/** Custom label text. If not provided, uses translation for the type */
	label?: string;
	/** URL destination for the link */
	href: string;
	/** Link target attribute. Defaults to '_self' */
	target?: '_blank' | '_self';
	/** Link rel attribute. Defaults to 'noopener noreferrer' when target is '_blank' */
	rel?: string;
}

/**
 * Props for the LegalLinks component that renders a list of legal links.
 */
export interface LegalLinksProps extends Omit<BoxProps, 'themeKey'> {
	/** Array of legal links to render. Returns null if undefined or empty */
	links?: LegalLink[];
	/** Theme key for styling the component */
	themeKey: AllThemeKeys;
}

/**
 * Renders a list of legal links (e.g., privacy policy, cookie policy).
 *
 * @example
 * ```tsx
 * <LegalLinks
 *   links={[
 *     { type: 'privacyPolicy', href: '/privacy' },
 *     { type: 'cookiePolicy', href: '/cookies', target: '_blank' }
 *   ]}
 *   themeKey="cookieBanner"
 * />
 * ```
 *
 * @public
 */
export const LegalLinks = forwardRef<HTMLDivElement, LegalLinksProps>(
	({ links, themeKey, ...props }, ref) => {
		const { legalLinks } = useTranslations();

		if (!links || links.length === 0) {
			return null;
		}

		return (
			<Box
				ref={ref as Ref<HTMLDivElement>}
				baseClassName={styles.container}
				themeKey={themeKey}
				{...props}
			>
				{links.map((link, index) => (
					<a
						key={link.href}
						href={link.href}
						target={link.target || '_self'}
						rel={
							link.rel ||
							(link.target === '_blank' ? 'noopener noreferrer' : undefined)
						}
						className={styles.link}
					>
						{link.label ?? (legalLinks && legalLinks[link.type])}
					</a>
				))}
			</Box>
		);
	}
);

LegalLinks.displayName = 'LegalLinks';
