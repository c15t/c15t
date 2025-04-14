import type { ThemeValue } from '~/types/theme';
import type {
	AccordionCSSVariables,
	AccordionContentCSSVariables,
	AccordionIconCSSVariables,
	AccordionItemCSSVariables,
	AccordionTriggerCSSVariables,
} from '../shared/ui/accordion';
import type {
	SwitchCSSVariables,
	SwitchThumbCSSVariables,
	SwitchTrackCSSVariables,
} from '../shared/ui/switch';

/**
 * Configuration object for styling different parts of the ConsentManagerWidget component.
 * @public
 */
export type ConsentManagerWidgetTheme = Partial<{
	/** @remarks Styles for the root container element */
	'widget.root': ThemeValue;
	/** @remarks Styles for the branding element */
	'widget.branding': ThemeValue;
	/** @remarks Styles for the footer element */
	'widget.footer': ThemeValue;
	/** @remarks Styles for the footer sub-group element */
	'widget.footer.sub-group': ThemeValue;
	/** @remarks Styles for the footer reject button element */
	'widget.footer.reject-button': ThemeValue;
	/** @remarks Styles for the footer accept button element */
	'widget.footer.accept-button': ThemeValue;
	/** @remarks Styles for the footer customize button element */
	'widget.footer.customize-button': ThemeValue;
	/** @remarks Styles for the footer save button element */
	'widget.footer.save-button': ThemeValue;
	/** @remarks Styles for the accordion element */
	'widget.accordion': ThemeValue<AccordionCSSVariables>;
	/** @remarks Styles for the accordion trigger element */
	'widget.accordion.trigger': ThemeValue<AccordionTriggerCSSVariables>;
	/** @remarks Styles for the accordion trigger inner element */
	'widget.accordion.trigger-inner': ThemeValue<AccordionTriggerCSSVariables>;
	/** @remarks Styles for the accordion item element */
	'widget.accordion.item': ThemeValue<AccordionItemCSSVariables>;
	/** @remarks Styles for the accordion icon element */
	'widget.accordion.icon': ThemeValue<AccordionIconCSSVariables>;
	/** @remarks Styles for the accordion arrow open element */
	'widget.accordion.arrow.open': ThemeValue<AccordionIconCSSVariables>;
	/** @remarks Styles for the accordion arrow close element */
	'widget.accordion.arrow.close': ThemeValue<AccordionIconCSSVariables>;
	/** @remarks Styles for the accordion content element */
	'widget.accordion.content': ThemeValue<AccordionContentCSSVariables>;
	/** @remarks Styles for the accordion content inner element */
	'widget.accordion.content-inner': ThemeValue<AccordionContentCSSVariables>;
	/** @remarks Styles for the switch element */
	'widget.switch': ThemeValue<SwitchCSSVariables>;
	/** @remarks Styles for the switch track element */
	'widget.switch.track': ThemeValue<SwitchTrackCSSVariables>;
	/** @remarks Styles for the switch thumb element */
	'widget.switch.thumb': ThemeValue<SwitchThumbCSSVariables>;
}>;
