'use client';

/**
 * Enhanced CookieBanner component with compound components attached.
 *
 * @remarks
 * This is the main export that provides access to all CookieBanner components.
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
	CookieBanner as CookieBannerComponent,
	type CookieBannerProps,
} from './cookie-banner';

/**
 * This interface extends the base CookieBanner component with additional sub-components
 * that can be used to compose the banner's structure.
 */
export interface CookieBannerCompoundComponent extends FC<CookieBannerProps> {
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
 * A customizable cookie consent banner component.
 *
 * @remarks
 * This component serves as the main entry point for rendering a cookie consent banner.
 * It provides a structured layout with customizable title, description, and action buttons
 * for accepting, rejecting, or customizing cookie preferences.
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
 * <CookieBanner />
 * ```
 *
 * @example
 * Customized usage with all props:
 * ```tsx
 * <CookieBanner
 *   theme={{
 *     root: "bg-white p-4",
 *     title: "text-xl font-bold",
 *     description: "text-gray-600",
 *     actions: "mt-4 flex gap-2"
 *   }}
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
 * <CookieBanner.Root>
 *   <CookieBanner.Content>
 *     <CookieBanner.Title>Cookie Settings</CookieBanner.Title>
 *     <CookieBanner.Description>
 *       Choose your cookie preferences
 *     </CookieBanner.Description>
 *     <CookieBanner.Actions>
 *       <CookieBanner.RejectButton>Decline</CookieBanner.RejectButton>
 *       <CookieBanner.CustomizeButton>Customize</CookieBanner.CustomizeButton>
 *       <CookieBanner.AcceptButton>Accept</CookieBanner.AcceptButton>
 *     </CookieBanner.Actions>
 *   </CookieBanner.Content>
 * </CookieBanner.Root>
 * ```
 * Note: Next.js Server Components do not support compound components. Ensure you add 'use client' to the file.
 * Using compound components for custom layout:
 *
 * @public
 */
const CookieBanner = Object.assign(CookieBannerComponent, {
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
}) as CookieBannerCompoundComponent;

// Export the main component as both default and named export
export default CookieBanner;
export { CookieBanner };

// Export individual components for backward compatibility
export { CookieBannerOverlay, Overlay } from './atoms/overlay';
export { CookieBannerRoot, Root } from './atoms/root';
export {
	AcceptButton,
	Card,
	CookieBannerAcceptButton,
	CookieBannerCard,
	CookieBannerCustomizeButton,
	CookieBannerDescription,
	CookieBannerFooter,
	CookieBannerFooterSubGroup,
	CookieBannerHeader,
	CookieBannerRejectButton,
	CookieBannerTitle,
	CustomizeButton,
	Description,
	Footer,
	FooterSubGroup,
	Header,
	RejectButton,
	Title,
} from './components';

export type { CookieBannerTheme } from './theme';
