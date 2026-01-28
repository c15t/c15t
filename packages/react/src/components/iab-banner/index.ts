'use client';

/**
 * Enhanced IABBanner component with compound components attached.
 *
 * @remarks
 * This is the main export that provides access to all IABBanner components.
 * It follows the compound components pattern, allowing for flexible composition
 * of the banner's parts.
 */

import type { FC } from 'react';
import {
	IABBannerButtonGroup,
	IABBannerFooterSpacer,
} from './atoms/button-group';
import { IABBannerCard } from './atoms/card';
import { IABBannerDescription } from './atoms/description';
import { IABBannerFooter } from './atoms/footer';
import { IABBannerHeader } from './atoms/header';
import { IABBannerOverlay } from './atoms/overlay';
import { IABBannerRoot } from './atoms/root';
import { IABBannerTitle } from './atoms/title';
import {
	IABBanner as IABBannerComponent,
	type IABBannerProps,
} from './iab-banner';

/**
 * This interface extends the base IABBanner component with additional sub-components
 * that can be used to compose the banner's structure.
 */
export interface IABBannerCompoundComponent extends FC<IABBannerProps> {
	Root: typeof IABBannerRoot;
	Card: typeof IABBannerCard;
	Header: typeof IABBannerHeader;
	Title: typeof IABBannerTitle;
	Description: typeof IABBannerDescription;
	Footer: typeof IABBannerFooter;
	ButtonGroup: typeof IABBannerButtonGroup;
	FooterSpacer: typeof IABBannerFooterSpacer;
	Overlay: typeof IABBannerOverlay;
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
 * <IABBanner />
 * ```
 *
 * @example
 * Using compound components for custom layout:
 * ```tsx
 * <IABBanner.Root>
 *   <IABBanner.Card>
 *     <IABBanner.Header>
 *       <IABBanner.Title>Privacy Settings</IABBanner.Title>
 *       <IABBanner.Description>We and our partners...</IABBanner.Description>
 *     </IABBanner.Header>
 *     <IABBanner.Footer>
 *       <IABBanner.ButtonGroup>
 *         <Button onClick={handleReject}>Reject All</Button>
 *         <Button onClick={handleAccept}>Accept All</Button>
 *       </IABBanner.ButtonGroup>
 *     </IABBanner.Footer>
 *   </IABBanner.Card>
 * </IABBanner.Root>
 * ```
 *
 * Note: Next.js Server Components do not support compound components.
 * Ensure you add 'use client' to the file.
 *
 * @public
 */
const IABBanner = Object.assign(IABBannerComponent, {
	Root: IABBannerRoot,
	Card: IABBannerCard,
	Header: IABBannerHeader,
	Title: IABBannerTitle,
	Description: IABBannerDescription,
	Footer: IABBannerFooter,
	ButtonGroup: IABBannerButtonGroup,
	FooterSpacer: IABBannerFooterSpacer,
	Overlay: IABBannerOverlay,
}) as IABBannerCompoundComponent;

// Export the main component as both default and named export
export default IABBanner;
export { IABBanner, type IABBannerProps };

// Export individual components for direct usage
export {
	IABBannerButtonGroup,
	IABBannerFooterSpacer,
} from './atoms/button-group';
export { IABBannerCard } from './atoms/card';
export { IABBannerDescription } from './atoms/description';
export { IABBannerFooter } from './atoms/footer';
export { IABBannerHeader } from './atoms/header';
export { IABBannerOverlay } from './atoms/overlay';
export { IABBannerRoot } from './atoms/root';
export { IABBannerTitle } from './atoms/title';
