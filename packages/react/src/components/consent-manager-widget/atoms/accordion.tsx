import type { AllConsentNames, ConsentType } from 'c15t';

import {
	type ComponentPropsWithoutRef,
	type ComponentRef,
	forwardRef,
	type Ref,
	useCallback,
} from 'react';
import { Box, type BoxProps } from '~/components/shared/primitives/box';
import * as RadixAccordion from '~/components/shared/ui/accordion';
import { LucideIcon } from '~/components/shared/ui/icon';
import * as RadixSwitch from '~/components/shared/ui/switch';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useTranslations } from '~/hooks/use-translations';
import styles from '../consent-manager-widget.module.css';

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
const ConsentManagerWidgetAccordionItems = () => {
	const { selectedConsents, setSelectedConsent, getDisplayedConsents } =
		useConsentManager();
	const handleConsentChange = useCallback(
		(name: AllConsentNames, checked: boolean) => {
			setSelectedConsent(name, checked);
		},
		[setSelectedConsent]
	);

	function formatConsentName(name: AllConsentNames) {
		return name
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (c: string) => c.toUpperCase());
	}

	const { consentTypes } = useTranslations();
	return getDisplayedConsents().map((consent: ConsentType) => (
		<ConsentManagerWidgetAccordionItem
			value={consent.name}
			key={consent.name}
			themeKey="widgetAccordion"
			className={styles.accordionItem}
		>
			<ConsentManagerWidgetAccordionTrigger
				themeKey="widgetAccordion"
				data-testid={`consent-manager-widget-accordion-trigger-${consent.name}`}
			>
				<ConsentManagerWidgetAccordionTriggerInner
					themeKey="widgetAccordion"
					className={styles.accordionTriggerInner}
					data-testid={`consent-manager-widget-accordion-trigger-inner-${consent.name}`}
				>
					<ConsentManagerWidgetAccordionArrow
						data-testid={`consent-manager-widget-accordion-arrow-${consent.name}`}
						className={styles.accordionArrow}
						openIcon={{
							Element: LucideIcon({
								title: 'Open',
								iconPath: <path d="M5 12h14M12 5v14" />,
							}),
							themeKey: 'widgetAccordion' as any,
						}}
						closeIcon={{
							Element: LucideIcon({
								title: 'Close',
								iconPath: <path d="M5 12h14" />,
							}),
							themeKey: 'widgetAccordion' as any,
						}}
					/>
					{consentTypes[consent.name]?.title ?? formatConsentName(consent.name)}
				</ConsentManagerWidgetAccordionTriggerInner>

				<ConsentManagerWidgetSwitch
					checked={selectedConsents[consent.name]}
					onClick={(e) => e.stopPropagation()}
					onKeyUp={(e) => e.stopPropagation()}
					onKeyDown={(e) => e.stopPropagation()}
					onCheckedChange={(checked) =>
						handleConsentChange(consent.name, checked)
					}
					disabled={consent.disabled}
					theme={{
						root: { themeKey: 'toggle' as any, className: styles.switch },
						thumb: {
							themeKey: 'toggle' as any,
							className: styles.switchThumb,
						},
						track: { themeKey: 'toggle' as any },
					}}
					data-testid={`consent-manager-widget-switch-${consent.name}`}
				/>
			</ConsentManagerWidgetAccordionTrigger>
			<ConsentManagerWidgetAccordionContent
				theme={{
					content: {
						themeKey: 'widgetAccordion' as any,
						className: styles.accordionContent,
					},
					contentInner: {
						themeKey: 'widgetAccordion' as any,
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
