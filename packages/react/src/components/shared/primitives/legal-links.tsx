import { forwardRef, type Ref } from 'react';
import type { AllThemeKeys } from '~/types/theme/style-keys';
import { Box, type BoxProps } from './box';
import styles from './legal-links.module.css';

export interface LegalLink {
	label: string;
	href: string;
	target?: '_blank' | '_self';
	rel?: string;
}

export interface LegalLinksProps extends Omit<BoxProps, 'themeKey'> {
	links: LegalLink[];
	themeKey: AllThemeKeys;
}

export const LegalLinks = forwardRef<HTMLDivElement, LegalLinksProps>(
	({ links, themeKey, ...props }, ref) => {
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
						key={`${link.href}-${index}`}
						href={link.href}
						target={link.target || '_self'}
						rel={
							link.rel ||
							(link.target === '_blank' ? 'noopener noreferrer' : undefined)
						}
						className={styles.link}
					>
						{link.label}
					</a>
				))}
			</Box>
		);
	}
);

LegalLinks.displayName = 'LegalLinks';
