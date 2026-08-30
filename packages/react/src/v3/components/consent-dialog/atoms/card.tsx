'use client';

/**
 * @packageDocumentation
 * A collection of components for building privacy consent management dialogs.
 * Built with accessibility and customization in mind, following GDPR and other privacy regulation requirements.
 */

import brandingStyles from '@c15t/ui/styles/v3/branding';
import styles from '@c15t/ui/styles/v3/consent-dialog';
import { forwardRef, type ReactNode, type Ref } from 'react';

import { useTranslations } from '~/v3/component-hooks/use-translations';
import { ConsentWidget } from '~/v3/components/consent-widget/consent-widget';
import { Slot } from '~/v3/components/shared/libs/slot';
import { Box, type BoxProps } from '~/v3/components/shared/primitives/box';
import type { InlineLegalLinksProps } from '~/v3/components/shared/primitives/legal-links';
import { InlineLegalLinks } from '~/v3/components/shared/primitives/legal-links';
import {
	BrandingLink,
	type BrandingVariant,
} from '~/v3/components/shared/ui/branding';
import { useTheme } from '~/v3/hooks/use-theme';
import type { ClassNameStyle } from '~/v3/types/theme';
import { useUIConfig } from '~/v3/ui-config-context';
import { cnExt as cn } from '~/v3/utils/cn';
import { mergeSlotProps } from '~/v3/utils/merge-slot-props';

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
				slotKey="dialog.card"
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
	Omit<BoxProps, 'slotKey'>
>(({ children, ...props }, ref) => {
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.header}
			{...props}
			slotKey="dialog.header"
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
	Omit<BoxProps, 'slotKey'>
>(({ children, ...props }, ref) => {
	const { consentManagerDialog: consentDialog } = useTranslations();
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.title}
			slotKey="dialog.title"
			{...props}
			id="consent-dialog-title"
			data-testid="consent-dialog-title"
			role="heading"
			aria-level={2}
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
	Omit<BoxProps, 'slotKey'> & {
		legalLinks?: InlineLegalLinksProps['links'];
	}
>(
	(
		{ children, legalLinks, asChild, className, style, noStyle, ...props },
		ref
	) => {
		const { consentManagerDialog: consentDialog } = useTranslations();
		const { components } = useUIConfig();
		const { noStyle: contextNoStyle } = useTheme();
		const context = 'dialog';
		const descriptionProps = mergeSlotProps(
			components?.description?.[context],
			{
				baseClassName: styles.description,
				className,
				'data-testid': 'consent-dialog-description',
				noStyle: noStyle ?? contextNoStyle,
				style,
				...props,
			}
		);

		if (asChild) {
			const Comp = Slot;
			return (
				<Comp
					ref={ref as Ref<HTMLDivElement>}
					{...descriptionProps}
				>
					{children ?? consentDialog.description}
				</Comp>
			);
		}
		return (
			<div
				ref={ref as Ref<HTMLDivElement>}
				{...descriptionProps}
			>
				{children ?? consentDialog.description}
				<InlineLegalLinks
					links={legalLinks}
					context="dialog"
					testIdPrefix="consent-dialog-legal-link"
				/>
			</div>
		);
	}
);

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
	Omit<BoxProps, 'slotKey'>
>(({ children, ...props }, ref) => {
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.content}
			slotKey="dialog.content"
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
>(({ children, hideBranding, 'data-testid': testId, ...props }, ref) => {
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={cn(
				styles.footer,
				children == null && !hideBranding && brandingStyles.brandingFooter
			)}
			data-testid={testId ?? 'consent-dialog-footer'}
			{...props}
			slotKey="manager.footer"
		>
			{children ?? (
				<Branding
					hideBranding={hideBranding ?? false}
					variant="dialog-tag"
					slotContext="dialog"
					data-testid="consent-dialog-branding"
				/>
			)}
		</Box>
	);
});

type BrandingProps = {
	hideBranding: boolean;
	variant?: BrandingVariant;
	slotContext?: import('~/v3/components/shared/ui/branding').BrandingSlotContext;
	className?: string;
	'data-testid'?: string;
};

export function Branding(props: BrandingProps) {
	return <BrandingLink {...props} />;
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
	legalLinks?: InlineLegalLinksProps['links'];
	hideBranding?: boolean;
}) => {
	return (
		<ConsentDialogCard>
			<ConsentDialogHeader>
				<ConsentDialogHeaderTitle />
				<ConsentDialogHeaderDescription legalLinks={legalLinks} />
			</ConsentDialogHeader>
			<ConsentDialogContent>
				<ConsentWidget
					hideBranding
					noStyle={noStyle}
					useProvider={true}
				/>
			</ConsentDialogContent>
			<Branding
				hideBranding={hideBranding ?? false}
				variant="dialog-tag"
				slotContext="dialog"
				data-testid="consent-dialog-branding"
			/>
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
	ConsentCustomizationCard,
	ConsentDialogCard,
	ConsentDialogContent,
	ConsentDialogFooter,
	ConsentDialogHeader,
	ConsentDialogHeaderDescription,
	ConsentDialogHeaderTitle,
	Content,
	Footer,
	Header,
	HeaderDescription,
	HeaderTitle,
};
