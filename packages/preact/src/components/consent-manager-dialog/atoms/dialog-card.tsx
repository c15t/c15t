/**
 * @packageDocumentation
 * A collection of components for building privacy consent management dialogs.
 * Built with accessibility and customization in mind, following GDPR, CCPA, and other privacy regulation requirements.
 */

import styles from '@c15t/styles/components/consent-manager-dialog/css';
import type { ClassNameStyle } from '@c15t/styles/types';
import type { ComponentChildren } from 'preact';
import { forwardRef } from 'preact/compat';
import { ConsentManagerWidget } from '~/components/consent-manager-widget/consent-manager-widget';
import { Box, type BoxProps } from '~/components/shared/primitives/box';
import {
	LegalLinks,
	type LegalLinksProps,
} from '~/components/shared/primitives/legal-links';
import { C15TIcon, ConsentLogo } from '~/components/shared/ui/logo';
import { useConsentManager } from '~/hooks';
import { useTranslations } from '~/hooks/use-translations';

/**
 * Props for the DialogCard and related components
 * @public
 */
type DialogCardProps = {
	/** The content to be rendered inside the dialog card */
	children?: ComponentChildren;
} & ClassNameStyle &
	Omit<BoxProps, 'children' | 'themeKey'>;

/**
 * The root component for creating a privacy consent dialog card.
 * Provides the main container and styling for the consent interface.
 *
 * @example
 * ```tsx
 * <DialogCard>
 *   <DialogHeader>
 *     <DialogHeaderTitle>Privacy Settings</DialogHeaderTitle>
 *   </DialogHeader>
 *   <DialogContent>
 *     <ConsentManagerWidget />
 *   </DialogContent>
 * </DialogCard>
 * ```
 */
const DialogCard = forwardRef<HTMLDivElement, DialogCardProps>(
	({ children, ...props }, ref) => {
		return (
			<Box
				ref={ref}
				className={styles.card}
				{...props}
				themeKey="dialog.card"
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
				ref={ref}
				className={styles.header}
				{...props}
				themeKey="dialog.header"
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
	return (
		<Box
			ref={ref}
			className={styles.title}
			themeKey="dialog.title"
			{...props}
			data-testid="consent-manager-dialog-title"
		>
			{children}
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
 */
const DialogHeaderDescription = forwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'themeKey'> & {
		legalLinks?: LegalLinksProps['links'];
	}
>(({ children, legalLinks, asChild, ...props }, ref) => {
	if (asChild) {
		return (
			<Box
				ref={ref}
				className={styles.description}
				themeKey="dialog.description"
				asChild={asChild}
				{...props}
			>
				{children}
			</Box>
		);
	}

	return (
		<Box
			ref={ref}
			className={styles.description}
			themeKey="dialog.description"
			{...props}
			data-testid="consent-manager-dialog-description"
		>
			{children}
			<LegalLinks
				links={legalLinks}
				themeKey="dialog.legal-links"
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
				ref={ref}
				className={styles.content}
				themeKey="dialog.content"
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
 * Contains branding and additional privacy-related links.
 *
 * @remarks
 * - Should be the last child of DialogCard
 * - Includes c15t.com branding by default
 * - Can be customized through theme configuration
 */
const DialogFooter = forwardRef<HTMLDivElement, BoxProps>(
	({ children, themeKey, ...props }, ref) => {
		return (
			<Box
				ref={ref}
				className={styles.footer}
				themeKey={themeKey || 'dialog.footer'}
				{...props}
				data-testid="consent-manager-dialog-footer"
			>
				{children}
			</Box>
		);
	}
);

/**
 * The branding footer with configurable logo
 */
export const BrandingFooter = () => {
	const { branding } = useConsentManager();

	if (branding === 'none') {
		return null;
	}

	const refParam =
		typeof window !== 'undefined' ? `?ref=${window.location.hostname}` : '';

	return (
		<a
			className={styles.branding}
			href={
				branding === 'consent'
					? `https://consent.io${refParam}`
					: `https://c15t.com${refParam}`
			}
		>
			Secured by Secured by{' '}
			{branding === 'consent' ? (
				<ConsentLogo className={styles.brandingConsent} />
			) : (
				<C15TIcon className={styles.brandingC15T} />
			)}
		</a>
	);
};

/**
 * A pre-configured privacy settings dialog card.
 * Combines all dialog components with default content for privacy customization.
 *
 * @param {Object} props - Component props
 * @param {boolean} [props.noStyle] - When true, removes default styling
 * @param {boolean} [props.useConsentLogo] - When true, uses the Consent logo instead of C15T logo
 *
 * @example
 * ```tsx
 * <ConsentCustomizationCard noStyle={false} />
 * ```
 *
 * @remarks
 * - Provides a complete privacy settings interface
 * - Follows GDPR and CCPA requirements
 * - Includes consent type management
 * - Built-in accessibility features
 */
const ConsentCustomizationCard = ({
	noStyle,
}: {
	noStyle?: boolean;
	useConsentLogo?: boolean;
}) => {
	const { consentManagerDialog: translations } = useTranslations();

	return (
		<DialogCard>
			<DialogHeader>
				<DialogHeaderTitle>{translations.title}</DialogHeaderTitle>
				<DialogHeaderDescription>
					{translations.description}
				</DialogHeaderDescription>
			</DialogHeader>
			<DialogContent>
				<ConsentManagerWidget
					hideBranding
					noStyle={noStyle}
					useProvider={true}
				/>
			</DialogContent>
			<DialogFooter themeKey="dialog.footer">
				<BrandingFooter />
			</DialogFooter>
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
