import { CookieBannerOverlay, Overlay } from './atoms/overlay';
import { CookieBannerRoot, Root } from './atoms/root';
import {
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

/**
 * Enhanced CookieBanner component with compound components attached.
 *
 * @remarks
 * This is the main export that provides access to all CookieBanner components.
 * It follows the compound components pattern, allowing for flexible composition
 * of the banner's parts.
 *
 * @example
 * Basic usage:
 * ```tsx
 * import CookieBanner from '@your-org/elements';
 *
 * function App() {
 *   return (
 *     <CookieBanner
 *       title="Privacy Notice"
 *       description="We use cookies to enhance your experience."
 *     />
 *   );
 * }
 * ```
 *
 * @example
 * Using compound components:
 * ```tsx
 * import CookieBanner from '@your-org/elements';
 *
 * function App() {
 *   return (
 *     <CookieBanner.Root>
 *       <CookieBanner.Content>
 *         <CookieBanner.Title>Cookie Settings</CookieBanner.Title>
 *         <CookieBanner.Description>
 *           Please choose your cookie preferences
 *         </CookieBanner.Description>
 *         <CookieBanner.Actions>
 *           <CookieBanner.RejectButton>Decline</CookieBanner.RejectButton>
 *           <CookieBanner.CustomizeButton>Customize</CookieBanner.CustomizeButton>
 *           <CookieBanner.AcceptButton>Accept All</CookieBanner.AcceptButton>
 *         </CookieBanner.Actions>
 *       </CookieBanner.Content>
 *     </CookieBanner.Root>
 *   );
 * }
 */

export {
	CookieBannerTitle,
	CookieBannerAcceptButton,
	CookieBannerCard,
	CookieBannerCustomizeButton,
	CookieBannerDescription,
	CookieBannerFooter,
	CookieBannerFooterSubGroup,
	CookieBannerHeader,
	CookieBannerOverlay,
	CookieBannerRejectButton,
	CookieBannerRoot,
	AcceptButton,
	Card,
	CustomizeButton,
	Description,
	Footer,
	FooterSubGroup,
	Header,
	Overlay,
	RejectButton,
	Root,
	Title,
};
export type { CookieBannerTheme } from './theme';
