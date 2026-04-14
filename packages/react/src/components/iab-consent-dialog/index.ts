'use client';

/**
 * Enhanced IABConsentDialog component with compound components attached.
 *
 * @remarks
 * This is the main export that provides access to all IABConsentDialog components.
 * It follows the compound components pattern, allowing for flexible composition
 * of the consent dialog's parts.
 */

import type { FC } from 'react';
import { IABConsentDialogCard } from './atoms/card';
import { IABConsentDialogContent } from './atoms/content';
import { IABConsentDialogFooter } from './atoms/footer';
import { IABConsentDialogHeader } from './atoms/header';
import { IABConsentDialogOverlay } from './atoms/overlay';
import { PurposeItem } from './atoms/purpose-item';
import { IABConsentDialogRoot } from './atoms/root';
import { StackItem } from './atoms/stack-item';
import { IABConsentDialogTabButton, IABConsentDialogTabs } from './atoms/tabs';
import { VendorList } from './atoms/vendor-list';
import { useGVLData } from './hooks/use-gvl-data';
import {
	IABConsentDialog as IABConsentDialogComponent,
	type IABConsentDialogProps,
} from './iab-consent-dialog';

/**
 * This interface extends the base IABConsentDialog component with additional sub-components
 * that can be used to compose the consent dialog's structure.
 */
export interface IABConsentDialogCompoundComponent
	extends FC<IABConsentDialogProps> {
	Root: typeof IABConsentDialogRoot;
	Card: typeof IABConsentDialogCard;
	Header: typeof IABConsentDialogHeader;
	Tabs: typeof IABConsentDialogTabs;
	TabButton: typeof IABConsentDialogTabButton;
	Content: typeof IABConsentDialogContent;
	Footer: typeof IABConsentDialogFooter;
	Overlay: typeof IABConsentDialogOverlay;
	PurposeItem: typeof PurposeItem;
	StackItem: typeof StackItem;
	VendorList: typeof VendorList;
}

/**
 * IAB TCF 2.3 compliant consent dialog dialog component.
 *
 * @remarks
 * This component serves as the main entry point for rendering an IAB-compliant consent dialog.
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
 * <IABConsentDialog />
 * ```
 *
 * @example
 * Using compound components for custom layout:
 * ```tsx
 * <IABConsentDialog.Root>
 *   <IABConsentDialog.Card>
 *     <IABConsentDialog.Header />
 *     <IABConsentDialog.Tabs />
 *     <IABConsentDialog.Content>
 *       Custom content
 *     </IABConsentDialog.Content>
 *     <IABConsentDialog.Footer />
 *   </IABConsentDialog.Card>
 * </IABConsentDialog.Root>
 * ```
 *
 * Note: Next.js Server Components do not support compound components.
 * Ensure you add 'use client' to the file.
 *
 * @public
 */
const IABConsentDialog = Object.assign(IABConsentDialogComponent, {
	Root: IABConsentDialogRoot,
	Card: IABConsentDialogCard,
	Header: IABConsentDialogHeader,
	Tabs: IABConsentDialogTabs,
	TabButton: IABConsentDialogTabButton,
	Content: IABConsentDialogContent,
	Footer: IABConsentDialogFooter,
	Overlay: IABConsentDialogOverlay,
	PurposeItem,
	StackItem,
	VendorList,
}) as IABConsentDialogCompoundComponent;

// Export the main component as both default and named export
export default IABConsentDialog;

// Export individual components for direct usage
export { IABConsentDialogCard } from './atoms/card';
export { IABConsentDialogContent } from './atoms/content';
export { IABConsentDialogFooter } from './atoms/footer';
export { IABConsentDialogHeader } from './atoms/header';
export { IABConsentDialogOverlay } from './atoms/overlay';
export { PurposeItem } from './atoms/purpose-item';
export { IABConsentDialogRoot } from './atoms/root';
export { StackItem } from './atoms/stack-item';
export {
	IABConsentDialogTabButton,
	IABConsentDialogTabs,
} from './atoms/tabs';
export { VendorList } from './atoms/vendor-list';
// Export hooks
export { type GVLData, useGVLData } from './hooks/use-gvl-data';
// Export types
export type {
	ProcessedPurpose,
	ProcessedSpecialFeature,
	ProcessedStack,
	ProcessedVendor,
} from './types';
export { IABConsentDialog, type IABConsentDialogProps };
