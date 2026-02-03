'use client';

/**
 * @packageDocumentation
 * A collection of components for building privacy consent management dialogs.
 * Built with accessibility and customization in mind, following GDPR and other privacy regulation requirements.
 */

import styles from '@c15t/ui/styles/components/consent-dialog.module.css';
import { forwardRef, type ReactNode, type Ref } from 'react';
import { ConsentWidget } from '~/components/consent-widget/consent-widget';
import { Box, type BoxProps } from '~/components/shared/primitives/box';
import type { LegalLinksProps } from '~/components/shared/primitives/legal-links';
import { InlineLegalLinks } from '~/components/shared/primitives/legal-links';
import { C15TIcon, ConsentIconOnly } from '~/components/shared/ui/logo';
import { useConsentManager } from '~/hooks';
import { useTranslations } from '~/hooks/use-translations';
import type { ClassNameStyle } from '~/types/theme';

/**
 * Props for the ConsentDialogCard and related components
 * @public
 */
type ConsentDialogCardProps = {
	/** The content to be rendered inside the consent dialog card */
	children?: ReactNode;
} & ClassNameStyle;

const ConsentDialogCard = forwardRef<HTMLDivElement, ConsentDialogCardProps>(
	({ children, ...props }, ref) => {
		return (
			<Box
				ref={ref as Ref<HTMLDivElement>}
				baseClassName={styles.card}
				{...props}
				themeKey="consentDialogCard"
				data-testid="consent-dialog-card"
			>
				{children}
			</Box>
		);
	}
);

/**
 * The header section of the consent dialog.
 * Should contain the ConsentDialogHeaderTitle and optionally ConsentDialogHeaderDescription.
 *
 * @remarks
 * - Provides semantic structure for accessibility
 * - Should be the first child of ConsentDialogCard
 * - Styled according to the theme configuration
 */
const ConsentDialogHeader = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'>
>(({ children, ...props }, ref) => {
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.header}
			{...props}
			themeKey="consentDialogHeader"
			data-testid="consent-dialog-header"
		>
			{children}
		</Box>
	);
});

/**
 * The title component for the consent dialog header.
 * Displays the main heading of the consent management interface.
 *
 * @remarks
 * - Uses proper heading semantics for accessibility
 * - Should be used within ConsentDialogHeader
 * - Supports theme customization
 */
const ConsentDialogHeaderTitle = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'>
>(({ children, ...props }, ref) => {
	const { consentManagerDialog: consentDialog } = useTranslations();
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.title}
			themeKey="consentDialogTitle"
			{...props}
			data-testid="consent-dialog-title"
		>
			{children ?? consentDialog.title}
		</Box>
	);
});

/**
 * The description component for the consent dialog header.
 * Provides additional context about privacy settings and consent choices.
 *
 * @remarks
 * - Should be used after ConsentDialogHeaderTitle
 * - Supports theme customization
 * - Important for explaining privacy choices to users
 * - Can include legal links inline with the description
 */
const ConsentDialogHeaderDescription = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'> & {
		legalLinks?: LegalLinksProps['links'];
	}
>(({ children, legalLinks, asChild, ...props }, ref) => {
	const { consentManagerDialog: consentDialog } = useTranslations();
	if (asChild) {
		return (
			<Box
				ref={ref as Ref<HTMLDivElement>}
				baseClassName={styles.description}
				themeKey="consentDialogDescription"
				asChild={asChild}
				{...props}
			>
				{children ?? consentDialog.description}
			</Box>
		);
	}
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.description}
			themeKey="consentDialogDescription"
			asChild={asChild}
			{...props}
			data-testid="consent-dialog-description"
		>
			{children ?? consentDialog.description}
			<InlineLegalLinks
				links={legalLinks}
				themeKey="consentDialogContent"
				testIdPrefix="consent-dialog-legal-link"
			/>
		</Box>
	);
});

/**
 * The main content area of the consent dialog.
 * Contains the consent management interface and privacy controls.
 *
 * @remarks
 * - Typically contains ConsentWidget
 * - Supports custom content and styling
 * - Handles user interactions with privacy settings
 */
const ConsentDialogContent = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'>
>(({ children, ...props }, ref) => {
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.content}
			themeKey="consentDialogContent"
			data-testid="consent-dialog-content"
			{...props}
		>
			{children}
		</Box>
	);
});

/**
 * The footer section of the consent dialog.
 * This contains the branding but can be overidden with a custom footer.
 */
const ConsentDialogFooter = forwardRef<
	HTMLDivElement,
	BoxProps & { hideBranding?: boolean; 'data-testid'?: string }
>(
	(
		{ children, themeKey, hideBranding, 'data-testid': testId, ...props },
		ref
	) => {
		return (
			<Box
				ref={ref as Ref<HTMLDivElement>}
				baseClassName={styles.footer}
				data-testid={testId ?? 'consent-dialog-footer'}
				{...props}
				themeKey={themeKey ?? 'consentDialogFooter'}
			>
				{children ?? <Branding hideBranding={hideBranding ?? false} />}
			</Box>
		);
	}
);

export function Branding({ hideBranding }: { hideBranding: boolean }) {
	const { branding } = useConsentManager();

	if (branding === 'none' || hideBranding) {
		return null;
	}

	const refParam =
		typeof window !== 'undefined' ? `?ref=${window.location.hostname}` : '';

	return (
		<a
			dir="ltr"
			className={styles.branding}
			href={
				branding === 'consent'
					? `https://consent.io${refParam}`
					: `https://c15t.com${refParam}`
			}
		>
			Secured by{' '}
			{branding === 'consent' ? (
				<ConsentIconOnly className={styles.brandingConsent} />
			) : (
				<C15TIcon className={styles.brandingC15T} />
			)}
		</a>
	);
}

/**
 * A pre-configured privacy settings card.
 * Combines all consent dialog components with default content for privacy customization.
 *
 * @param {Object} props - Component props
 * @param {boolean} [props.noStyle] - When true, removes default styling
 * @param {LegalLink[]} [props.legalLinks] - Legal document links to display in footer
 * @param {boolean} [props.hideBranding] - Whether to hide the branding in the footer
 *
 * @example
 * ```tsx
 * <ConsentCustomizationCard
 *   noStyle={false}
 *   legalLinks={[{label: "Privacy Policy", href: "/privacy"}]}
 *   hideBranding={false}
 * />
 * ```
 *
 * @remarks
 * - Provides a complete privacy settings interface
 * - Includes consent type management
 * - Built-in accessibility features
 */
const ConsentCustomizationCard = ({
	noStyle,
	legalLinks,
	hideBranding,
}: {
	noStyle?: boolean;
	legalLinks?: LegalLinksProps['links'];
	hideBranding?: boolean;
}) => {
	return (
		<ConsentDialogCard>
			<ConsentDialogHeader>
				<ConsentDialogHeaderTitle />
				<ConsentDialogHeaderDescription legalLinks={legalLinks} />
			</ConsentDialogHeader>
			<ConsentDialogContent>
				<ConsentWidget hideBranding noStyle={noStyle} useProvider={true} />
			</ConsentDialogContent>
			<ConsentDialogFooter hideBranding={hideBranding} />
		</ConsentDialogCard>
	);
};

const Card = ConsentDialogCard;
const Header = ConsentDialogHeader;
const HeaderTitle = ConsentDialogHeaderTitle;
const HeaderDescription = ConsentDialogHeaderDescription;
const Content = ConsentDialogContent;
const Footer = ConsentDialogFooter;

export {
	Card,
	Header,
	HeaderTitle,
	HeaderDescription,
	Content,
	Footer,
	ConsentCustomizationCard,
	ConsentDialogFooter,
	ConsentDialogHeader,
	ConsentDialogHeaderTitle,
	ConsentDialogHeaderDescription,
	ConsentDialogContent,
	ConsentDialogCard,
};
