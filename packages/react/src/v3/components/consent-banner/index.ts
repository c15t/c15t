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
import { PolicyActions } from './policy-actions';

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
	PolicyActions: typeof PolicyActions;
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
 * Start with the pre-built component and its existing configuration surface.
 * For most customization, use `ConsentManagerProvider` options, theme tokens,
 * slots, and `theme.consentActions` before reaching for compound composition.
 *
 * Key features:
 * - Fully accessible by default
 * - GDPR Compliant
 * - Customizable appearance
 * - Responsive design
 * - Error boundary protection
 * - Advanced compound component support when markup must change
 *
 * @example
 * Simple usage with default settings:
 * ```tsx
 * <ConsentBanner />
 * ```
 *
 * @example
 * Preferred customization via provider `i18n`, theme tokens, and slots:
 * ```tsx
 * <ConsentManagerProvider
 *   options={{
 *     i18n: {
 *       locale: 'en',
 *       messages: {
 *         en: {
 *           cookieBanner: { title: 'Privacy choices' },
 *         },
 *       },
 *     },
 *     theme: {
 *       colors: {
 *         surface: '#fffdf8',
 *         surfaceHover: '#f6f3ee',
 *       },
 *       slots: {
 *         consentBannerCard: 'rounded-3xl',
 *         consentBannerFooter: 'border-t border-black/10',
 *       },
 *     },
 *   }}
 * >
 *   <ConsentBanner primaryButton="accept" />
 * </ConsentManagerProvider>
 * ```
 *
 * @example
 * Advanced custom markup with compound components:
 * ```tsx
 * <ConsentBanner.Root>
 *   <ConsentBanner.Card>
 *     <ConsentBanner.Header>
 *       <ConsentBanner.Title />
 *       <ConsentBanner.Description />
 *     </ConsentBanner.Header>
 *     <ConsentBanner.Footer>
 *       <ConsentBanner.CustomizeButton />
 *       <ConsentBanner.FooterSubGroup>
 *         <ConsentBanner.RejectButton />
 *         <ConsentBanner.AcceptButton />
 *       </ConsentBanner.FooterSubGroup>
 *     </ConsentBanner.Footer>
 *   </ConsentBanner.Card>
 * </ConsentBanner.Root>
 * ```
 * Note: Next.js Server Components do not support compound components. Ensure you add `'use client'` to the file.
 *
 * @public
 */
const ConsentBanner = Object.assign(ConsentBannerComponent, {
	Root,
	Card,
	Header,
	Title,
	Description,
	PolicyActions,
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
	type ConsentBannerPolicyActionRenderProps,
	ConsentBannerPolicyActions,
	type ConsentBannerPolicyActionsProps,
	PolicyActions,
} from './policy-actions';
export {
	ConsentBanner,
	type ConsentBannerButton,
	type ConsentBannerLayout,
	type ConsentBannerProps,
};
