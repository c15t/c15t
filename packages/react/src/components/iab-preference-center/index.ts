'use client';

/**
 * Enhanced IABPreferenceCenter component with compound components attached.
 *
 * @remarks
 * This is the main export that provides access to all IABPreferenceCenter components.
 * It follows the compound components pattern, allowing for flexible composition
 * of the preference center's parts.
 */

import type { FC } from 'react';
import { IABPreferenceCenterCard } from './atoms/card';
import { IABPreferenceCenterContent } from './atoms/content';
import { IABPreferenceCenterFooter } from './atoms/footer';
import { IABPreferenceCenterHeader } from './atoms/header';
import { IABPreferenceCenterOverlay } from './atoms/overlay';
import { PurposeItem } from './atoms/purpose-item';
import { IABPreferenceCenterRoot } from './atoms/root';
import { StackItem } from './atoms/stack-item';
import {
	IABPreferenceCenterTabButton,
	IABPreferenceCenterTabs,
} from './atoms/tabs';
import { VendorList } from './atoms/vendor-list';
import { useGVLData } from './hooks/use-gvl-data';
import {
	IABPreferenceCenter as IABPreferenceCenterComponent,
	type IABPreferenceCenterProps,
} from './iab-preference-center';

/**
 * This interface extends the base IABPreferenceCenter component with additional sub-components
 * that can be used to compose the preference center's structure.
 */
export interface IABPreferenceCenterCompoundComponent
	extends FC<IABPreferenceCenterProps> {
	Root: typeof IABPreferenceCenterRoot;
	Card: typeof IABPreferenceCenterCard;
	Header: typeof IABPreferenceCenterHeader;
	Tabs: typeof IABPreferenceCenterTabs;
	TabButton: typeof IABPreferenceCenterTabButton;
	Content: typeof IABPreferenceCenterContent;
	Footer: typeof IABPreferenceCenterFooter;
	Overlay: typeof IABPreferenceCenterOverlay;
	PurposeItem: typeof PurposeItem;
	StackItem: typeof StackItem;
	VendorList: typeof VendorList;
}

/**
 * IAB TCF 2.3 compliant preference center dialog component.
 *
 * @remarks
 * This component serves as the main entry point for rendering an IAB-compliant preference center.
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
 * <IABPreferenceCenter />
 * ```
 *
 * @example
 * Using compound components for custom layout:
 * ```tsx
 * <IABPreferenceCenter.Root>
 *   <IABPreferenceCenter.Card>
 *     <IABPreferenceCenter.Header />
 *     <IABPreferenceCenter.Tabs />
 *     <IABPreferenceCenter.Content>
 *       Custom content
 *     </IABPreferenceCenter.Content>
 *     <IABPreferenceCenter.Footer />
 *   </IABPreferenceCenter.Card>
 * </IABPreferenceCenter.Root>
 * ```
 *
 * Note: Next.js Server Components do not support compound components.
 * Ensure you add 'use client' to the file.
 *
 * @public
 */
const IABPreferenceCenter = Object.assign(IABPreferenceCenterComponent, {
	Root: IABPreferenceCenterRoot,
	Card: IABPreferenceCenterCard,
	Header: IABPreferenceCenterHeader,
	Tabs: IABPreferenceCenterTabs,
	TabButton: IABPreferenceCenterTabButton,
	Content: IABPreferenceCenterContent,
	Footer: IABPreferenceCenterFooter,
	Overlay: IABPreferenceCenterOverlay,
	PurposeItem,
	StackItem,
	VendorList,
}) as IABPreferenceCenterCompoundComponent;

// Export the main component as both default and named export
export default IABPreferenceCenter;
export { IABPreferenceCenter, type IABPreferenceCenterProps };

// Export individual components for direct usage
export { IABPreferenceCenterCard } from './atoms/card';
export { IABPreferenceCenterContent } from './atoms/content';
export { IABPreferenceCenterFooter } from './atoms/footer';
export { IABPreferenceCenterHeader } from './atoms/header';
export { IABPreferenceCenterOverlay } from './atoms/overlay';
export { PurposeItem } from './atoms/purpose-item';
export { IABPreferenceCenterRoot } from './atoms/root';
export { StackItem } from './atoms/stack-item';
export {
	IABPreferenceCenterTabButton,
	IABPreferenceCenterTabs,
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
