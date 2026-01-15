'use client';

/**
 * @packageDocumentation
 * A collection of components for building privacy consent management dialogs.
 * Built with accessibility and customization in mind, following GDPR and other privacy regulation requirements.
 */

import styles from '@c15t/ui/styles/components/consent-manager-dialog.module.css';
import { forwardRef, type ReactNode, type Ref } from 'react';
import { ConsentManagerWidget } from '~/components/consent-manager-widget/consent-manager-widget';
import { Box, type BoxProps } from '~/components/shared/primitives/box';
import type { LegalLinksProps } from '~/components/shared/primitives/legal-links';
import { InlineLegalLinks } from '~/components/shared/primitives/legal-links';
import { C15TIcon, ConsentLogo } from '~/components/shared/ui/logo';
import { useConsentManager } from '~/hooks';
import { useTranslations } from '~/hooks/use-translations';
import type { ClassNameStyle } from '~/types/theme';

/**
 * Props for the DialogCard and related components
 * @public
 */
type DialogCardProps = {
	/** The content to be rendered inside the dialog card */
	children?: ReactNode;
} & ClassNameStyle;

const DialogCard = forwardRef<HTMLDivElement, DialogCardProps>(
	({ children, ...props }, ref) => {
		return (
			<Box
				ref={ref as Ref<HTMLDivElement>}
				className={styles.card}
				{...props}
				themeKey="dialogCard"
				data-testid="consent-manager-dialog-card"
			>
				{children}
			</Box>
		);
	}
);

/**
 * The header section of the privacy dialog.
 * Should contain the DialogHeaderTitle and optionally DialogHeaderDescription.
 *
 * @remarks
 * - Provides semantic structure for accessibility
 * - Should be the first child of DialogCard
 * - Styled according to the theme configuration
 */
const DialogHeader = forwardRef<HTMLDivElement, Omit<BoxProps, 'themeKey'>>(
	({ children, ...props }, ref) => {
		return (
			<Box
				ref={ref as Ref<HTMLDivElement>}
				className={styles.header}
				{...props}
				themeKey="dialogHeader"
				data-testid="consent-manager-dialog-header"
			>
				{children}
			</Box>
		);
	}
);

/**
 * The title component for the privacy dialog header.
 * Displays the main heading of the consent management interface.
 *
 * @remarks
 * - Uses proper heading semantics for accessibility
 * - Should be used within DialogHeader
 * - Supports theme customization
 */
const DialogHeaderTitle = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'>
>(({ children, ...props }, ref) => {
	const { consentManagerDialog } = useTranslations();
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			className={styles.title}
			themeKey="dialogTitle"
			{...props}
			data-testid="consent-manager-dialog-title"
		>
			{children ?? consentManagerDialog.title}
		</Box>
	);
});

/**
 * The description component for the privacy dialog header.
 * Provides additional context about privacy settings and consent choices.
 *
 * @remarks
 * - Should be used after DialogHeaderTitle
 * - Supports theme customization
 * - Important for explaining privacy choices to users
 * - Can include legal links inline with the description
 */
const DialogHeaderDescription = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'> & {
		legalLinks?: LegalLinksProps['links'];
	}
>(({ children, legalLinks, asChild, ...props }, ref) => {
	const { consentManagerDialog } = useTranslations();
	if (asChild) {
		return (
			<Box
				ref={ref as Ref<HTMLDivElement>}
				className={styles.description}
				themeKey="dialogDescription"
				asChild={asChild}
				{...props}
			>
				{children ?? consentManagerDialog.description}
			</Box>
		);
	}
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			className={styles.description}
			themeKey="dialogDescription"
			asChild={asChild}
			{...props}
			data-testid="consent-manager-dialog-description"
		>
			{children ?? consentManagerDialog.description}
			<InlineLegalLinks
				links={legalLinks}
				themeKey="dialogContent"
				testIdPrefix="consent-manager-dialog-legal-link"
			/>
		</Box>
	);
});

/**
 * The main content area of the privacy dialog.
 * Contains the consent management interface and privacy controls.
 *
 * @remarks
 * - Typically contains ConsentManagerWidget
 * - Supports custom content and styling
 * - Handles user interactions with privacy settings
 */
const DialogContent = forwardRef<HTMLDivElement, Omit<BoxProps, 'themeKey'>>(
	({ children, ...props }, ref) => {
		return (
			<Box
				ref={ref as Ref<HTMLDivElement>}
				className={styles.content}
				themeKey="dialogContent"
				data-testid="consent-manager-dialog-content"
				{...props}
			>
				{children}
			</Box>
		);
	}
);

/**
 * The footer section of the privacy dialog.
 * This contains the branding but can be overidden with a custom footer.
 */
const DialogFooter = forwardRef<
	HTMLDivElement,
	BoxProps & { hideBranding?: boolean }
>(({ children, themeKey, hideBranding, ...props }, ref) => {
	const Footer = ({ content }: { content: ReactNode }) => (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			className={styles.footer}
			themeKey={themeKey ?? 'dialogFooter'}
			{...props}
			data-testid="consent-manager-dialog-footer"
		>
			{content}
		</Box>
	);

	if (children) {
		return <Footer content={children} />;
	}

	return <Footer content={<Branding hideBranding={hideBranding ?? false} />} />;
});

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
				<ConsentLogo className={styles.brandingConsent} />
			) : (
				<C15TIcon className={styles.brandingC15T} />
			)}
		</a>
	);
}

/**
 * A pre-configured privacy settings dialog card.
 * Combines all dialog components with default content for privacy customization.
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
		<DialogCard>
			<DialogHeader>
				<DialogHeaderTitle />
				<DialogHeaderDescription legalLinks={legalLinks} />
			</DialogHeader>
			<DialogContent>
				<ConsentManagerWidget
					hideBranding
					noStyle={noStyle}
					useProvider={true}
				/>
			</DialogContent>
			<DialogFooter hideBranding={hideBranding} />
		</DialogCard>
	);
};

const Card = DialogCard;
const Header = DialogHeader;
const HeaderTitle = DialogHeaderTitle;
const HeaderDescription = DialogHeaderDescription;
const Content = DialogContent;
const Footer = DialogFooter;

export {
	Card,
	Header,
	HeaderTitle,
	HeaderDescription,
	Content,
	Footer,
	ConsentCustomizationCard,
	DialogFooter,
	DialogHeader,
	DialogHeaderTitle,
	DialogHeaderDescription,
	DialogContent,
};
