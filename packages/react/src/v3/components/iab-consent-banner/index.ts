'use client';

/**
 * Enhanced IABConsentBanner component with compound components attached.
 *
 * @remarks
 * This is the main export that provides access to all IABConsentBanner components.
 * It follows the compound components pattern, allowing for flexible composition
 * of the banner's parts.
 */

import type { FC } from 'react';
import {
	IABConsentBannerButtonGroup,
	IABConsentBannerFooterSpacer,
} from './atoms/button-group';
import { IABConsentBannerCard } from './atoms/card';
import { IABConsentBannerDescription } from './atoms/description';
import { IABConsentBannerFooter } from './atoms/footer';
import { IABConsentBannerHeader } from './atoms/header';
import { IABConsentBannerOverlay } from './atoms/overlay';
import { IABConsentBannerRoot } from './atoms/root';
import { IABConsentBannerTitle } from './atoms/title';
import {
	IABConsentBanner as IABConsentBannerComponent,
	type IABConsentBannerProps,
} from './iab-consent-banner';

/**
 * This interface extends the base IABConsentBanner component with additional sub-components
 * that can be used to compose the banner's structure.
 */
export interface IABConsentBannerCompoundComponent
	extends FC<IABConsentBannerProps> {
	Root: typeof IABConsentBannerRoot;
	Card: typeof IABConsentBannerCard;
	Header: typeof IABConsentBannerHeader;
	Title: typeof IABConsentBannerTitle;
	Description: typeof IABConsentBannerDescription;
	Footer: typeof IABConsentBannerFooter;
	ButtonGroup: typeof IABConsentBannerButtonGroup;
	FooterSpacer: typeof IABConsentBannerFooterSpacer;
	Overlay: typeof IABConsentBannerOverlay;
}

/**
 * IAB TCF 2.3 compliant cookie consent banner component.
 *
 * @remarks
 * This component serves as the main entry point for rendering an IAB-compliant consent banner.
 * It provides a structured layout with required IAB TCF elements.
 *
 * Key features:
 * - IAB TCF 2.3 compliant
 * - Fully accessible by default
 * - Customizable appearance
 * - Compound component pattern support
 *
 * @example
 * Simple usage with default settings:
 * ```tsx
 * <IABConsentBanner />
 * ```
 *
 * @example
 * Using compound components for custom layout:
 * ```tsx
 * <IABConsentBanner.Root>
 *   <IABConsentBanner.Card>
 *     <IABConsentBanner.Header>
 *       <IABConsentBanner.Title>Privacy Settings</IABConsentBanner.Title>
 *       <IABConsentBanner.Description>We and our partners...</IABConsentBanner.Description>
 *     </IABConsentBanner.Header>
 *     <IABConsentBanner.Footer>
 *       <IABConsentBanner.ButtonGroup>
 *         <Button onClick={handleReject}>Reject All</Button>
 *         <Button onClick={handleAccept}>Accept All</Button>
 *       </IABConsentBanner.ButtonGroup>
 *     </IABConsentBanner.Footer>
 *   </IABConsentBanner.Card>
 * </IABConsentBanner.Root>
 * ```
 *
 * Note: Next.js Server Components do not support compound components.
 * Ensure you add 'use client' to the file.
 *
 * @public
 */
const IABConsentBanner = Object.assign(IABConsentBannerComponent, {
	Root: IABConsentBannerRoot,
	Card: IABConsentBannerCard,
	Header: IABConsentBannerHeader,
	Title: IABConsentBannerTitle,
	Description: IABConsentBannerDescription,
	Footer: IABConsentBannerFooter,
	ButtonGroup: IABConsentBannerButtonGroup,
	FooterSpacer: IABConsentBannerFooterSpacer,
	Overlay: IABConsentBannerOverlay,
}) as IABConsentBannerCompoundComponent;

// Export the main component as both default and named export
export default IABConsentBanner;

// Export individual components for direct usage
export {
	IABConsentBannerButtonGroup,
	IABConsentBannerFooterSpacer,
} from './atoms/button-group';
export { IABConsentBannerCard } from './atoms/card';
export { IABConsentBannerDescription } from './atoms/description';
export { IABConsentBannerFooter } from './atoms/footer';
export { IABConsentBannerHeader } from './atoms/header';
export { IABConsentBannerOverlay } from './atoms/overlay';
export { IABConsentBannerRoot } from './atoms/root';
export { IABConsentBannerTitle } from './atoms/title';
export { IABConsentBanner, type IABConsentBannerProps };
