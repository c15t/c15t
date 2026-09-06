import type { Branding } from '@c15t/core';
import styles from '@c15t/ui/styles/components/branding';
import type { SVGProps } from 'react';

import { useTranslations } from '~/component-hooks/use-translations';
import { useBranding } from '~/hooks';
import { useIsHydrated } from '~/hooks/use-is-hydrated';
import { useTheme } from '~/hooks/use-theme';
import type { CSSPropertiesWithVars } from '~/types/theme';
import { useUIConfig } from '~/ui-config-context';
import { cnExt as cn } from '~/utils/cn';
import { mergeSlotProps } from '~/utils/merge-slot-props';

import { C15TIconOnly, InthIconOnly, InthLogo } from './logo';

export type ResolvedBranding = 'c15t' | 'inth' | 'none';
export type BrandingVariant = 'footer' | 'dialog-tag' | 'banner-tag';
export type BrandingSlotContext =
	| 'banner'
	| 'dialog'
	| 'manager'
	| 'iab-banner'
	| 'iab-dialog';

interface BrandingProps {
	hideBranding: boolean;
	variant?: BrandingVariant;
	slotContext?: BrandingSlotContext;
	className?: string;
	style?: CSSPropertiesWithVars;
	'data-testid'?: string;
}

interface BrandingFullLogoProps {
	branding: Branding | string;
	className?: string;
}

type BrandingCompactLogoProps = SVGProps<SVGSVGElement> & {
	branding: Branding | string;
};

export const resolveBranding = function resolveBranding(
	branding: Branding | string
): ResolvedBranding {
	if (branding === 'none') {
		return 'none';
	}

	if (branding === 'inth' || branding === 'consent') {
		return 'inth';
	}

	return 'c15t';
};

export const getBrandingHref = function getBrandingHref(
	branding: Branding | string,
	refParam = ''
): string {
	return resolveBranding(branding) === 'inth'
		? `https://inth.com${refParam}`
		: `https://c15t.com${refParam}`;
};

export const BrandingFullLogo = ({
	branding,
	className,
}: BrandingFullLogoProps) => {
	if (resolveBranding(branding) === 'inth') {
		return (
			<span
				dir="ltr"
				className={cn(styles.brandingWordmark, className)}
			>
				<InthLogo aria-hidden="true" />
			</span>
		);
	}

	return (
		<span
			dir="ltr"
			className={cn(styles.brandingWordmark, className)}
		>
			<span className={styles.brandingC15TMark}>
				<C15TIconOnly aria-hidden="true" />
			</span>
			<span className={styles.brandingWordmarkLabel}>c15t</span>
		</span>
	);
};

export const BrandingCompactLogo = ({
	branding,
	...props
}: BrandingCompactLogoProps) => {
	const Logo =
		resolveBranding(branding) === 'inth' ? InthIconOnly : C15TIconOnly;
	return <Logo {...props} />;
};

export const BrandingLink = ({
	hideBranding,
	variant = 'footer',
	slotContext,
	className,
	style,
	'data-testid': testId,
}: BrandingProps) => {
	const branding = useBranding() ?? 'c15t';
	const { components } = useUIConfig();
	const { noStyle } = useTheme();
	const { common } = useTranslations();
	const resolvedBranding = resolveBranding(branding);
	// The referral hostname only exists in the browser. Reading `window` during
	// the hydration render would make the client href differ from the
	// server-rendered one and trip React's attribute-mismatch check, so the
	// parameter is added after hydration instead.
	const isHydrated = useIsHydrated();
	const refParam = isHydrated ? `?ref=${window.location.hostname}` : '';
	const context = slotContext;
	const brandingStyle = mergeSlotProps(
		context ? components?.tag?.[context] : undefined,
		{
			baseClassName: cn(
				styles.branding,
				variant !== 'footer' && styles.brandingTag,
				variant === 'dialog-tag' && styles.brandingTagDialog,
				variant === 'banner-tag' && styles.brandingTagBanner
			),
			className,
			'data-testid': testId,
			noStyle,
			style,
		}
	);
	const contentStyle = mergeSlotProps(
		context ? components?.tag?.content : undefined,
		{
			baseClassName: styles.brandingContent,
			noStyle,
		}
	);

	if (resolvedBranding === 'none' || hideBranding) {
		return null;
	}

	return (
		<a
			{...brandingStyle}
			href={getBrandingHref(branding, refParam)}
			data-branding={resolvedBranding}
			data-variant={variant}
		>
			<span
				{...contentStyle}
				data-slot="tag-content"
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
			</span>
		</a>
	);
};
