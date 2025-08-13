/**
 * Enhanced ConsentManagerWidget component with compound components attached.
 *
 * @remarks
 * This is the main export that provides access to all ConsentManagerWidget components.
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
import { ConsentManagerWidget as ConsentManagerWidgetComponent } from './consent-manager-widget';
import type { ConsentManagerWidgetProps } from './types';

/**
 * Type definition for the ConsentManagerWidget component with compound components attached.
 *
 * @remarks
 * This interface extends the base ConsentManagerWidget component with additional sub-components
 * that can be used to compose the widget's structure. Each component is designed to be
 * fully accessible and customizable while maintaining compliance with privacy regulations.
 *
 * @public
 */
interface ConsentManagerWidgetCompoundComponent
	extends FC<ConsentManagerWidgetProps> {
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
 * - Implements compound component pattern for flexible composition
 * - Manages consent state and user interactions
 * - Provides accessible controls for consent management
 * - Supports comprehensive theming
 * - Handles accordion state management
 *
 * @example
 * Basic usage:
 * ```tsx
 * <ConsentManagerWidget
 *   theme={{
 *     root: "custom-root-class",
 *     accordion: "custom-accordion-class",
 *     footer: "custom-footer-class"
 *   }}
 *   hideBrading={true}
 * />
 * ```
 *
 * @example
 * Compound components:
 * ```tsx
 * <ConsentManagerWidget.Root>
 *   <ConsentManagerWidget.Accordion>
 *     <ConsentManagerWidget.AccordionItems />
 *    </ConsentManagerWidget.Accordion>
 *  </ConsentManagerWidget.Root>
 * ```
 * Note: Next.js Server Components do not support compound components. Ensure you add 'use client' to the file.
 *
 */
const ConsentManagerWidget = Object.assign(ConsentManagerWidgetComponent, {
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
}) as ConsentManagerWidgetCompoundComponent;

// Export the main component as both default and named export
export default ConsentManagerWidget;
export { ConsentManagerWidget };

// Export individual components for backward compatibility
export {
	ConsentManagerWidgetAccordionTrigger,
	ConsentManagerWidgetAccordionTriggerInner,
	ConsentManagerWidgetAccordionContent,
	ConsentManagerWidgetAccordionArrow,
	ConsentManagerWidgetAccordion,
	ConsentManagerWidgetSwitch,
	ConsentManagerWidgetAccordionItems,
	ConsentManagerWidgetAccordionItem,
	AccordionTrigger,
	AccordionTriggerInner,
	AccordionContent,
	AccordionArrow,
	Accordion,
	Switch,
	AccordionItems,
	AccordionItem,
} from './atoms/accordion';

export {
	Root,
	ConsentManagerWidgetRoot,
} from './atoms/root';

export {
	AcceptAllButton,
	CustomizeButton,
	SaveButton,
	RejectButton,
	ConsentManagerWidgetAcceptAllButton,
	ConsentManagerWidgetCustomizeButton,
	ConsentManagerWidgetSaveButton,
	ConsentManagerWidgetRejectButton,
} from './atoms/button';

export {
	ConsentManagerWidgetFooter,
	ConsentManagerWidgetFooterSubGroup,
	Footer,
	FooterSubGroup,
} from './atoms/footer';

export type { ConsentManagerWidgetTheme } from './theme';
