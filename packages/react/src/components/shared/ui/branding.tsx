import styles from '@c15t/ui/styles/components/consent-dialog.module.js';
import type { Branding } from 'c15t';
import type { SVGProps } from 'react';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useTranslations } from '~/hooks/use-translations';
import { cnExt as cn } from '~/utils/cn';
import { C15TIconOnly, InthIconOnly, InthLogo } from './logo';

export type ResolvedBranding = 'c15t' | 'inth' | 'none';
export type BrandingVariant = 'footer' | 'dialog-tag' | 'banner-tag';

type BrandingProps = {
	hideBranding: boolean;
	variant?: BrandingVariant;
	className?: string;
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
			<C15TIconOnly className={styles.brandingC15TMark} aria-hidden="true" />
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
	className,
	'data-testid': testId,
}: BrandingProps) {
	const { branding } = useConsentManager();
	const { common } = useTranslations();
	const resolvedBranding = resolveBranding(branding);

	if (resolvedBranding === 'none' || hideBranding) {
		return null;
	}

	const refParam =
		typeof window !== 'undefined' ? `?ref=${window.location.hostname}` : '';

	return (
		<a
			className={cn(
				styles.branding,
				variant !== 'footer' && styles.brandingTag,
				variant === 'dialog-tag' && styles.brandingTagDialog,
				variant === 'banner-tag' && styles.brandingTagBanner,
				className
			)}
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
