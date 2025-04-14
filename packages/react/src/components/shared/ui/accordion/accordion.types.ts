/**
 * CSS variables for the layout of the accordion component
 */
export type AccordionLayoutCSSVariables = {
  '--accordion-padding': string;
  '--accordion-radius': string;
  '--accordion-duration': string;
  '--accordion-ease': string;
  '--accordion-icon-size': string;
};

/**
 * CSS variables for the colors of the accordion component
 */
export type AccordionColorCSSVariables = {
  '--accordion-background-color': string;
  '--accordion-background-hover': string;
  '--accordion-border-color': string;
  '--accordion-text-color': string;
  '--accordion-icon-color': string;
  '--accordion-arrow-color': string;
  '--accordion-content-color': string;
  '--accordion-focus-ring': string;
};

/**
 * CSS variables for the root accordion component
 */
export type AccordionRootCSSVariables = AccordionLayoutCSSVariables &
  AccordionColorCSSVariables;

/**
 * CSS variables for the accordion item component
 */
export type AccordionItemCSSVariables = {
  '--accordion-background-color': string;
  '--accordion-border-color': string;
  '--accordion-radius': string;
};

/**
 * CSS variables for the accordion trigger component
 */
export type AccordionTriggerCSSVariables = {
  '--accordion-text-color': string;
  '--accordion-focus-ring': string;
  '--accordion-radius': string;
  '--accordion-padding': string;
};

/**
 * CSS variables for the accordion icon component
 */
export type AccordionIconCSSVariables = {
  '--accordion-icon-size': string;
  '--accordion-icon-color': string;
};

/**
 * CSS variables for the accordion content component
 */
export type AccordionContentCSSVariables = {
  '--accordion-duration': string;
  '--accordion-ease': string;
  '--accordion-content-color': string;
};

/**
 * All CSS variables used in the accordion component
 */
export type AccordionCSSVariables = AccordionRootCSSVariables;
