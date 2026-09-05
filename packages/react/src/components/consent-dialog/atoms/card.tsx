'use client';

import brandingStyles from '@c15t/ui/styles/components/branding';
/**
 * @packageDocumentation
 * A collection of components for building privacy consent management dialogs.
 * Built with accessibility and customization in mind, following GDPR and other privacy regulation requirements.
 */
import styles from '@c15t/ui/styles/components/consent-dialog';
import { forwardRef as createForwardRef } from 'react';
import type { ReactNode, Ref } from 'react';

import { useTranslations } from '~/component-hooks/use-translations';
import { ConsentWidget } from '~/components/consent-widget/consent-widget';
import { Slot } from '~/components/shared/libs/slot';
import { Box } from '~/components/shared/primitives/box';
import type { BoxProps } from '~/components/shared/primitives/box';
import type { InlineLegalLinksProps } from '~/components/shared/primitives/legal-links';
import { InlineLegalLinks } from '~/components/shared/primitives/legal-links';
import { BrandingLink } from '~/components/shared/ui/branding';
import type {
	BrandingSlotContext,
	BrandingVariant,
} from '~/components/shared/ui/branding';
import { useTheme } from '~/hooks/use-theme';
import type { ClassNameStyle } from '~/types/theme';
import { useUIConfig } from '~/ui-config-context';
import { cnExt as cn } from '~/utils/cn';
import { mergeSlotProps } from '~/utils/merge-slot-props';

/**
 * Props for the ConsentDialogCard and related components
 * @public
 */
type ConsentDialogCardProps = {
	/** The content to be rendered inside the consent dialog card */
	children?: ReactNode;
} & ClassNameStyle;

const ConsentDialogCard = createForwardRef<
	HTMLDivElement,
	ConsentDialogCardProps
>(({ children, ...props }, ref) => (
	<Box
		ref={ref as Ref<HTMLDivElement>}
		baseClassName={styles.card}
		{...props}
		slotKey="dialog.card"
		data-testid="consent-dialog-card"
	>
		{children}
	</Box>
));
ConsentDialogCard.displayName = 'ConsentDialogCard';

/**
 * The header section of the consent dialog.
 * Should contain the ConsentDialogHeaderTitle and optionally ConsentDialogHeaderDescription.
 *
 * @remarks
 * - Provides semantic structure for accessibility
 * - Should be the first child of ConsentDialogCard
 * - Styled according to the theme configuration
 */
const ConsentDialogHeader = createForwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'slotKey'>
>(({ children, ...props }, ref) => (
	<Box
		ref={ref as Ref<HTMLDivElement>}
		baseClassName={styles.header}
		{...props}
		slotKey="dialog.header"
		data-testid="consent-dialog-header"
	>
		{children}
	</Box>
));
ConsentDialogHeader.displayName = 'ConsentDialogHeader';

/**
 * The title component for the consent dialog header.
 * Displays the main heading of the consent management interface.
 *
 * @remarks
 * - Uses proper heading semantics for accessibility
 * - Should be used within ConsentDialogHeader
 * - Supports theme customization
 */
const ConsentDialogHeaderTitle = createForwardRef<
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
			asChild
		>
			<h2>{children ?? consentDialog.title}</h2>
		</Box>
	);
});
ConsentDialogHeaderTitle.displayName = 'ConsentDialogHeaderTitle';

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
const ConsentDialogHeaderDescription = createForwardRef<
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
				id: 'consent-dialog-description',
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
ConsentDialogHeaderDescription.displayName = 'ConsentDialogHeaderDescription';

/**
 * The main content area of the consent dialog.
 * Contains the consent management interface and privacy controls.
 *
 * @remarks
 * - Typically contains ConsentWidget
 * - Supports custom content and styling
 * - Handles user interactions with privacy settings
 */
const ConsentDialogContent = createForwardRef<
	HTMLDivElement,
	Omit<BoxProps, 'slotKey'>
>(({ children, ...props }, ref) => (
	<Box
		ref={ref as Ref<HTMLDivElement>}
		baseClassName={styles.content}
		slotKey="dialog.content"
		data-testid="consent-dialog-content"
		{...props}
	>
		{children}
	</Box>
));
ConsentDialogContent.displayName = 'ConsentDialogContent';

/**
 * The footer section of the consent dialog.
 * This contains the branding but can be overidden with a custom footer.
 */
export const Branding = (props: BrandingProps) => <BrandingLink {...props} />;
const ConsentDialogFooter = createForwardRef<
	HTMLDivElement,
	BoxProps & { hideBranding?: boolean; 'data-testid'?: string }
>(({ children, hideBranding, 'data-testid': testId, ...props }, ref) => (
	<Box
		ref={ref as Ref<HTMLDivElement>}
		baseClassName={cn(
			styles.footer,
			(children === null || children === undefined) &&
				!hideBranding &&
				brandingStyles.brandingFooter
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
));
ConsentDialogFooter.displayName = 'ConsentDialogFooter';

interface BrandingProps {
	hideBranding: boolean;
	variant?: BrandingVariant;
	slotContext?: BrandingSlotContext;
	className?: string;
	'data-testid'?: string;
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
}) => (
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
