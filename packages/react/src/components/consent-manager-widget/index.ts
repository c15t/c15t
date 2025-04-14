'use client';

/**
 * A customizable cookie consent banner component with compound components pattern.
 *
 * @packageDocumentation
 */

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
