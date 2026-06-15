import styles from '@c15t/ui/styles/components/consent-dialog.module.js';
import { resolveStyles, sanitizeDOMStyleProps } from '@c15t/ui/utils';
import type { Branding } from 'c15t';
import type { SVGProps } from 'react';
import { useMemo } from 'react';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useTheme } from '~/hooks/use-theme';
import { useTranslations } from '~/hooks/use-translations';
import type {
	AllThemeKeys,
	ClassNameStyle,
	CSSPropertiesWithVars,
} from '~/types/theme';
import { cnExt as cn } from '~/utils/cn';
import { mergeStyles } from '~/utils/merge-styles';
import { C15TIconOnly, InthIconOnly, InthLogo } from './logo';

export type ResolvedBranding = 'c15t' | 'inth' | 'none';
export type BrandingVariant = 'footer' | 'dialog-tag' | 'banner-tag';
export type BrandingThemeKey =
	| 'consentBannerTag'
	| 'consentDialogTag'
	| 'consentWidgetTag'
	| 'iabConsentBannerTag'
	| 'iabConsentDialogTag';

type BrandingProps = {
	hideBranding: boolean;
	variant?: BrandingVariant;
	themeKey?: BrandingThemeKey;
	className?: string;
	style?: CSSPropertiesWithVars;
	'data-testid'?: string;
};

type BrandingFullLogoProps = {
	branding: Branding | string;
	className?: string;
};

type BrandingCompactLogoProps = SVGProps<SVGSVGElement> & {
	branding: Branding | string;
};

export function resolveBranding(branding: Branding | string): ResolvedBranding {
	if (branding === 'none') {
		return 'none';
	}

	if (branding === 'inth' || branding === 'consent') {
		return 'inth';
	}

	return 'c15t';
}

export function getBrandingHref(
	branding: Branding | string,
	refParam = ''
): string {
	return resolveBranding(branding) === 'inth'
		? `https://inth.com${refParam}`
		: `https://c15t.com${refParam}`;
}

export function BrandingFullLogo({
	branding,
	className,
}: BrandingFullLogoProps) {
	if (resolveBranding(branding) === 'inth') {
		return (
			<span dir="ltr" className={cn(styles.brandingWordmark, className)}>
				<InthLogo aria-hidden="true" />
			</span>
		);
	}

	return (
		<span dir="ltr" className={cn(styles.brandingWordmark, className)}>
			<span className={styles.brandingC15TMark}>
				<C15TIconOnly aria-hidden="true" />
			</span>
			<span className={styles.brandingWordmarkLabel}>c15t</span>
		</span>
	);
}

export function BrandingCompactLogo({
	branding,
	...props
}: BrandingCompactLogoProps) {
	const Logo =
		resolveBranding(branding) === 'inth' ? InthIconOnly : C15TIconOnly;
	return <Logo {...props} />;
}

export function BrandingLink({
	hideBranding,
	variant = 'footer',
	themeKey,
	className,
	style,
	'data-testid': testId,
}: BrandingProps) {
	const { branding } = useConsentManager();
	const { noStyle: contextNoStyle, theme } = useTheme();
	const { common } = useTranslations();
	const resolvedBranding = resolveBranding(branding);
	const refParam =
		typeof window !== 'undefined' ? `?ref=${window.location.hostname}` : '';
	const brandingStyle = useMemo(() => {
		const componentStyle: ClassNameStyle = {
			baseClassName: cn(
				styles.branding,
				variant !== 'footer' && styles.brandingTag,
				variant === 'dialog-tag' && styles.brandingTagDialog,
				variant === 'banner-tag' && styles.brandingTagBanner
			),
			className,
			style,
		};
		if (themeKey && theme?.slots && themeKey in theme.slots) {
			return resolveStyles(
				themeKey as AllThemeKeys,
				theme,
				componentStyle,
				contextNoStyle
			);
		}

		return mergeStyles({}, componentStyle);
	}, [className, contextNoStyle, style, theme, themeKey, variant]);
	const domStyleProps = sanitizeDOMStyleProps(brandingStyle);

	if (resolvedBranding === 'none' || hideBranding) {
		return null;
	}

	return (
		<a
			{...domStyleProps}
			href={getBrandingHref(branding, refParam)}
			data-branding={resolvedBranding}
			data-variant={variant}
			data-testid={testId}
		>
			<span className={styles.brandingCopy}>
				<span className={styles.brandingText}>{common.securedBy}</span>
			</span>
			<BrandingFullLogo
				branding={branding}
				className={
					resolvedBranding === 'inth'
						? styles.brandingInth
						: styles.brandingC15T
				}
			/>
		</a>
	);
}
