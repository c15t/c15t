'use client';

/**
 * Enhanced ConsentBanner component with compound components attached.
 *
 * @remarks
 * This is the main export that provides access to all ConsentBanner components.
 * It follows the compound components pattern, allowing for flexible composition
 * of the banner's parts.
 *
 */

import type { FC } from 'react';
import { Overlay } from './atoms/overlay';
import { Root } from './atoms/root';
import {
	AcceptButton,
	Card,
	CustomizeButton,
	Description,
	Footer,
	FooterSubGroup,
	Header,
	RejectButton,
	Title,
} from './components';
import {
	type ConsentBannerButton,
	ConsentBanner as ConsentBannerComponent,
	type ConsentBannerLayout,
	type ConsentBannerProps,
} from './consent-banner';

/**
 * This interface extends the base ConsentBanner component with additional sub-components
 * that can be used to compose the banner's structure.
 */
export interface ConsentBannerCompoundComponent extends FC<ConsentBannerProps> {
	Root: typeof Root;
	Card: typeof Card;
	Header: typeof Header;
	Title: typeof Title;
	Description: typeof Description;
	Footer: typeof Footer;
	FooterSubGroup: typeof FooterSubGroup;
	RejectButton: typeof RejectButton;
	CustomizeButton: typeof CustomizeButton;
	AcceptButton: typeof AcceptButton;
	Overlay: typeof Overlay;
}
/**
 * A customizable consent banner component.
 *
 * @remarks
 * This component serves as the main entry point for rendering a consent banner.
 * It provides a structured layout with customizable title, description, and action buttons
 * for accepting, rejecting, or customizing consent preferences.
 *
 * Key features:
 * - Fully accessible by default
 * - GDPR Compliant
 * - Customizable appearance
 * - Responsive design
 * - Error boundary protection
 * - Compound component pattern support
 *
 * @example
 * Simple usage with default settings:
 * ```tsx
 * <ConsentBanner />
 * ```
 *
 * @example
 * Customized usage with all props:
 * ```tsx
 * <ConsentBanner
 *   title="Cookie Settings"
 *   description="We use cookies to enhance your browsing experience"
 *   rejectButtonText="Decline"
 *   customizeButtonText="Preferences"
 *   acceptButtonText="Allow All"
 * />
 * ```
 *
 * @example
 * ```tsx
 * <ConsentBanner.Root>
 *   <ConsentBanner.Content>
 *     <ConsentBanner.Title>Cookie Settings</ConsentBanner.Title>
 *     <ConsentBanner.Description>
 *       Choose your cookie preferences
 *     </ConsentBanner.Description>
 *     <ConsentBanner.Actions>
 *       <ConsentBanner.RejectButton>Decline</ConsentBanner.RejectButton>
 *       <ConsentBanner.CustomizeButton>Customize</ConsentBanner.CustomizeButton>
 *       <ConsentBanner.AcceptButton>Accept</ConsentBanner.AcceptButton>
 *     </ConsentBanner.Actions>
 *   </ConsentBanner.Content>
 * </ConsentBanner.Root>
 * ```
 * Note: Next.js Server Components do not support compound components. Ensure you add 'use client' to the file.
 * Using compound components for custom layout:
 *
 * @public
 */
const ConsentBanner = Object.assign(ConsentBannerComponent, {
	Root,
	Card,
	Header,
	Title,
	Description,
	Footer,
	FooterSubGroup,
	RejectButton,
	CustomizeButton,
	AcceptButton,
	Overlay,
	// Aliases for backward compatibility
	Content: Card,
	Actions: FooterSubGroup,
}) as ConsentBannerCompoundComponent;

// Export the main component as both default and named export
export default ConsentBanner;

// Export individual components for backward compatibility
export { ConsentBannerOverlay, Overlay } from './atoms/overlay';
export { ConsentBannerRoot, Root } from './atoms/root';
export {
	AcceptButton,
	Card,
	ConsentBannerAcceptButton,
	ConsentBannerCard,
	ConsentBannerCustomizeButton,
	ConsentBannerDescription,
	ConsentBannerFooter,
	ConsentBannerFooterSubGroup,
	ConsentBannerHeader,
	ConsentBannerRejectButton,
	ConsentBannerTitle,
	CustomizeButton,
	Description,
	Footer,
	FooterSubGroup,
	Header,
	RejectButton,
	Title,
} from './components';
export {
	ConsentBanner,
	type ConsentBannerButton,
	type ConsentBannerLayout,
	type ConsentBannerProps,
};
