'use client';

/**
 * Enhanced ConsentWidget component with compound components attached.
 *
 * @remarks
 * This is the main export that provides access to all ConsentWidget components.
 * It follows the compound components pattern, allowing for flexible composition
 * of the widget's parts.
 *
 */

import type { FC } from 'react';
import {
	Accordion,
	AccordionArrow,
	AccordionContent,
	AccordionItem,
	AccordionItems,
	AccordionTrigger,
	AccordionTriggerInner,
	Switch,
} from './atoms/accordion';
import {
	AcceptAllButton,
	CustomizeButton,
	RejectButton,
	SaveButton,
} from './atoms/button';
import { Footer, FooterSubGroup } from './atoms/footer';
import { Root } from './atoms/root';
import { ConsentWidget as ConsentWidgetComponent } from './consent-widget';
import type { ConsentWidgetProps } from './types';

export type { ConsentWidgetProps };

/**
 * This interface extends the base ConsentWidget component with additional sub-components
 * that can be used to compose the widget's structure. Each component is designed to be
 * fully accessible and customizable while maintaining compliance with privacy regulations.
 *
 * @public
 */
export interface ConsentWidgetCompoundComponent extends FC<ConsentWidgetProps> {
	// Accordion components
	AccordionTrigger: typeof AccordionTrigger;
	AccordionTriggerInner: typeof AccordionTriggerInner;
	AccordionContent: typeof AccordionContent;
	AccordionArrow: typeof AccordionArrow;
	Accordion: typeof Accordion;
	Switch: typeof Switch;
	AccordionItems: typeof AccordionItems;
	AccordionItem: typeof AccordionItem;
	// Root component
	Root: typeof Root;
	// Button components
	AcceptAllButton: typeof AcceptAllButton;
	CustomizeButton: typeof CustomizeButton;
	SaveButton: typeof SaveButton;
	RejectButton: typeof RejectButton;
	// Footer components
	Footer: typeof Footer;
	FooterSubGroup: typeof FooterSubGroup;
}

/**
 * The main consent management widget component.
 * Provides a pre-configured interface for managing privacy consents.
 *
 * @remarks
 * Key features:
 * - Manages consent state and user interactions
 * - Provides accessible controls for consent management
 * - Supports comprehensive theming with tokens and slots
 * - Handles accordion state management
 * - Exposes compound primitives for advanced layout changes
 *
 * @example
 * Basic usage:
 * ```tsx
 * <ConsentWidget
 *   hideBranding={true}
 * />
 * ```
 *
 * @example
 * Preferred stock customization with theme slots:
 * ```tsx
 * <ConsentManagerProvider
 *   options={{
 *     theme: {
 *       slots: {
 *         consentWidgetAccordion: 'rounded-3xl border border-black/10',
 *         consentWidgetFooter: 'border-t border-black/10',
 *       },
 *     },
 *   }}
 * >
 *   <ConsentWidget hideBranding />
 * </ConsentManagerProvider>
 * ```
 *
 * @example
 * Advanced compound components:
 * ```tsx
 * <ConsentWidget.Root>
 *   <ConsentWidget.Accordion>
 *     <ConsentWidget.AccordionItems />
 *   </ConsentWidget.Accordion>
 * </ConsentWidget.Root>
 * ```
 * Note: Next.js Server Components do not support compound components. Ensure you add `'use client'` to the file.
 *
 */
const ConsentWidget = Object.assign(ConsentWidgetComponent, {
	// Accordion components
	AccordionTrigger,
	AccordionTriggerInner,
	AccordionContent,
	AccordionArrow,
	Accordion,
	Switch,
	AccordionItems,
	AccordionItem,
	// Root component
	Root,
	// Button components
	AcceptAllButton,
	CustomizeButton,
	SaveButton,
	RejectButton,
	// Footer components
	Footer,
	FooterSubGroup,
}) as ConsentWidgetCompoundComponent;

// Export the main component as both default and named export
export default ConsentWidget;

// Export individual components for backward compatibility
export {
	Accordion,
	AccordionArrow,
	AccordionContent,
	AccordionItem,
	AccordionItems,
	AccordionTrigger,
	AccordionTriggerInner,
	ConsentWidgetAccordion,
	ConsentWidgetAccordionArrow,
	ConsentWidgetAccordionContent,
	ConsentWidgetAccordionItem,
	ConsentWidgetAccordionItems,
	ConsentWidgetAccordionTrigger,
	ConsentWidgetAccordionTriggerInner,
	ConsentWidgetSwitch,
	Switch,
} from './atoms/accordion';
export {
	AcceptAllButton,
	ConsentWidgetAcceptAllButton,
	ConsentWidgetCustomizeButton,
	ConsentWidgetRejectButton,
	ConsentWidgetSaveButton,
	CustomizeButton,
	RejectButton,
	SaveButton,
} from './atoms/button';
export {
	ConsentWidgetFooter,
	ConsentWidgetFooterSubGroup,
	Footer,
	FooterSubGroup,
} from './atoms/footer';
export {
	ConsentWidgetRoot,
	Root,
} from './atoms/root';
export { ConsentWidget };
