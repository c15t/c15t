import styles from '@c15t/ui/styles/v3/branding';
import type { Branding } from 'c15t';
import type { SVGProps } from 'react';
import { useTranslations } from '~/v3/component-hooks/use-translations';
import { useBranding } from '~/v3/hooks';
import { useTheme } from '~/v3/hooks/use-theme';
import type { CSSPropertiesWithVars } from '~/v3/types/theme';
import { useUIConfig } from '~/v3/ui-config-context';
import { cnExt as cn } from '~/v3/utils/cn';
import { mergeSlotProps } from '~/v3/utils/merge-slot-props';
import { C15TIconOnly, InthIconOnly, InthLogo } from './logo';

export type ResolvedBranding = 'c15t' | 'inth' | 'none';
export type BrandingVariant = 'footer' | 'dialog-tag' | 'banner-tag';
export type BrandingSlotContext =
	| 'banner'
	| 'dialog'
	| 'manager'
	| 'iab-banner'
	| 'iab-dialog';

type BrandingProps = {
	hideBranding: boolean;
	variant?: BrandingVariant;
	slotContext?: BrandingSlotContext;
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
	slotContext,
	className,
	style,
	'data-testid': testId,
}: BrandingProps) {
	const branding = useBranding() ?? 'c15t';
	const { components } = useUIConfig();
	const { noStyle } = useTheme();
	const { common } = useTranslations();
	const resolvedBranding = resolveBranding(branding);
	const refParam =
		typeof window !== 'undefined' ? `?ref=${window.location.hostname}` : '';
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
			noStyle,
			style,
			'data-testid': testId,
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
}
