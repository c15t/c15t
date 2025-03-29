import {
	type ComponentPropsWithoutRef,
	type ComponentRef,
	type Ref,
	forwardRef,
} from 'react';
import { Box, type BoxProps } from '~/components/shared/primitives/box';
import * as RadixAccordion from '~/components/shared/ui/accordion';
import * as RadixSwitch from '~/components/shared/ui/switch';
import { useTranslations } from '../../../hooks/use-translations';
import styles from '../consent-manager-widget.module.css';

import type { AllConsentNames, ConsentType } from 'c15t';

/**
 * Props for the consent accordion component
 */
export interface ConsentAccordionProps {
	/**
	 * Function to get the displayed consent types
	 */
	getDisplayedConsents: () => ConsentType[];

	/**
	 * Record of consent values by name
	 */
	consents: Record<string, boolean>;

	/**
	 * Function to update a specific consent
	 */
	setConsent: (name: AllConsentNames, value: boolean) => void;
}

/**
 * Accordion Trigger Component
 *
 * @remarks
 * - Provides visual grouping for related consent options
 * - Supports theme customization
 * - Maintains accessibility structure
 */
const ConsentManagerWidgetAccordionTrigger = forwardRef<
	HTMLDivElement,
	BoxProps
>(({ children, themeKey, ...props }, ref) => {
	return (
		<Box
			ref={ref as Ref<HTMLDivElement>}
			baseClassName={styles.accordionTrigger}
			themeKey={themeKey}
			{...props}
		>
			{children}
		</Box>
	);
});

const ConsentManagerWidgetAccordionTriggerInner = RadixAccordion.Trigger;
const ConsentManagerWidgetAccordionContent = RadixAccordion.Content;
const ConsentManagerWidgetAccordionArrow = RadixAccordion.Arrow;
const ConsentManagerWidgetAccordion = RadixAccordion.Root;
const ConsentManagerWidgetSwitch = RadixSwitch.Root;

/**
 * Renders a list of consent options as accordion items.
 *
 * @remarks
 * Key features:
 * - Automatically generates items from consent configuration
 * - Handles consent state management
 * - Implements accessible toggle controls
 * - Supports keyboard navigation
 *
 * @example
 * ```tsx
 * <ConsentManagerWidgetAccordion>
 *   <ConsentManagerWidgetAccordionItems />
 * </ConsentManagerWidgetAccordion>
 * ```
 */
const ConsentManagerWidgetAccordionItems = ({
	getDisplayedConsents,
	consents,
	setConsent,
}: ConsentAccordionProps) => {
	const { consentTypes } = useTranslations();

	function formatConsentName(name: string): string {
		return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');
	}

	return getDisplayedConsents().map((consent: ConsentType) => (
		<ConsentManagerWidgetAccordionItem
			value={consent.name}
			key={consent.name}
			themeKey="widget.accordion.item"
			className={styles.accordionItem}
		>
			<ConsentManagerWidgetAccordionTrigger
				themeKey="widget.accordion.trigger"
				data-testid={`consent-manager-widget-accordion-trigger-${consent.name}`}
			>
				<ConsentManagerWidgetAccordionTriggerInner
					themeKey="widget.accordion.trigger-inner"
					className={styles.accordionTriggerInner}
					data-testid={`consent-manager-widget-accordion-trigger-inner-${consent.name}`}
				>
					<ConsentManagerWidgetAccordionArrow
						data-testid={`consent-manager-widget-accordion-arrow-${consent.name}`}
						className={styles.accordionArrow}
					/>
					{consentTypes[consent.name]?.title ?? formatConsentName(consent.name)}
				</ConsentManagerWidgetAccordionTriggerInner>

				<ConsentManagerWidgetSwitch
					checked={consents[consent.name]}
					onClick={(e) => e.stopPropagation()}
					onKeyUp={(e) => e.stopPropagation()}
					onKeyDown={(e) => e.stopPropagation()}
					onCheckedChange={(checked) =>
						setConsent(consent.name as AllConsentNames, checked)
					}
					disabled={consent.disabled}
					theme={{
						root: { themeKey: 'widget.switch', className: styles.switch },
						thumb: {
							themeKey: 'widget.switch.thumb',
							className: styles.switchThumb,
						},
						track: { themeKey: 'widget.switch.track' },
					}}
					data-testid={`consent-manager-widget-switch-${consent.name}`}
				/>
			</ConsentManagerWidgetAccordionTrigger>
			<ConsentManagerWidgetAccordionContent
				theme={{
					content: {
						themeKey: 'widget.accordion.content',
						className: styles.accordionContent,
					},
					contentInner: {
						themeKey: 'widget.accordion.content-inner',
					},
				}}
				data-testid={`consent-manager-widget-accordion-content-${consent.name}`}
			>
				{consentTypes[consent.name]?.description ?? consent.description}
			</ConsentManagerWidgetAccordionContent>
		</ConsentManagerWidgetAccordionItem>
	));
};

const ConsentManagerWidgetAccordionItem = forwardRef<
	ComponentRef<typeof RadixAccordion.Item>,
	ComponentPropsWithoutRef<typeof RadixAccordion.Item>
>(({ className, ...rest }, forwardedRef) => {
	return (
		<RadixAccordion.Item
			ref={forwardedRef}
			className={styles.accordionItem}
			{...rest}
		/>
	);
});

const AccordionTriggerInner = ConsentManagerWidgetAccordionTriggerInner;
const AccordionTrigger = ConsentManagerWidgetAccordionTrigger;
const AccordionContent = ConsentManagerWidgetAccordionContent;
const AccordionArrow = ConsentManagerWidgetAccordionArrow;
const Accordion = ConsentManagerWidgetAccordion;
const Switch = ConsentManagerWidgetSwitch;
const AccordionItems = ConsentManagerWidgetAccordionItems;
const AccordionItem = ConsentManagerWidgetAccordionItem;

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
};
export function ConsentAccordion({
	getDisplayedConsents,
	consents,
	setConsent,
}: ConsentAccordionProps) {
	// Get translations
	const translations = useTranslations(); // No argument needed
	const { consentTypes } = translations;

	// Format consent name helper
	const formatConsentName = (name: string): string => {
		return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ');
	};

	return (
		<>
			{getDisplayedConsents().map((consent: ConsentType) => (
				<div key={consent.name} className="consent-accordion-item">
					<div className="consent-header">
						<h3>
							{consentTypes[consent.name]?.title ??
								formatConsentName(consent.name)}
						</h3>
						<label className="toggle-switch">
							<input
								type="checkbox"
								checked={consents[consent.name] || false}
								onChange={(e) =>
									setConsent(consent.name as AllConsentNames, e.target.checked)
								}
								disabled={consent.disabled}
							/>
							<span className="slider round" />
						</label>
					</div>
					<div className="consent-description">
						{consentTypes[consent.name]?.description ?? consent.description}
					</div>
				</div>
			))}
		</>
	);
}

