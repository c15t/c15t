import styles from '@c15t/ui/styles/components/consent-widget.module.js';
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

/**
 * Accordion Trigger Component
 *
 * @remarks
 * - Provides visual grouping for related consent options
 * - Supports theme customization
 * - Maintains accessibility structure
 */
const ConsentWidgetAccordionTrigger = forwardRef<HTMLDivElement, BoxProps>(
	({ children, ...props }, ref) => {
		return (
			<Box
				ref={ref as Ref<HTMLDivElement>}
				baseClassName={styles.accordionTrigger}
				{...props}
			>
				{children}
			</Box>
		);
	}
);

const ConsentWidgetAccordionTriggerInner = RadixAccordion.Trigger;
const ConsentWidgetAccordionContent = RadixAccordion.Content;
const ConsentWidgetAccordionArrow = RadixAccordion.Arrow;
const ConsentWidgetAccordion = RadixAccordion.Root;
const ConsentWidgetSwitch = RadixSwitch.Root;

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
 * <ConsentWidgetAccordion>
 *   <ConsentWidgetAccordionItems />
 * </ConsentWidgetAccordion>
 * ```
 */
const ConsentWidgetAccordionItems = () => {
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
		<ConsentWidgetAccordionItem
			value={consent.name}
			key={consent.name}
			className={styles.accordionItem}
		>
			<ConsentWidgetAccordionTrigger
				data-testid={`consent-widget-accordion-trigger-${consent.name}`}
			>
				<ConsentWidgetAccordionTriggerInner
					className={styles.accordionTriggerInner}
					data-testid={`consent-widget-accordion-trigger-inner-${consent.name}`}
				>
					<ConsentWidgetAccordionArrow
						data-testid={`consent-widget-accordion-arrow-${consent.name}`}
						className={styles.accordionArrow}
						openIcon={{
							Element: LucideIcon({
								title: 'Open',
								iconPath: <path d="M5 12h14M12 5v14" />,
							}),
							className: styles.accordionArrowIcon,
						}}
						closeIcon={{
							Element: LucideIcon({
								title: 'Close',
								iconPath: <path d="M5 12h14" />,
							}),
							className: styles.accordionArrowIcon,
						}}
					/>
					{consentTypes[consent.name]?.title ?? formatConsentName(consent.name)}
				</ConsentWidgetAccordionTriggerInner>

				<ConsentWidgetSwitch
					checked={selectedConsents[consent.name]}
					onClick={(e) => e.stopPropagation()}
					onKeyUp={(e) => e.stopPropagation()}
					onKeyDown={(e) => e.stopPropagation()}
					onCheckedChange={(checked) =>
						handleConsentChange(consent.name, checked)
					}
					disabled={consent.disabled}
					className={styles.switch}
					size="small"
					data-testid={`consent-widget-switch-${consent.name}`}
				/>
			</ConsentWidgetAccordionTrigger>
			<ConsentWidgetAccordionContent
				className={styles.accordionContent}
				data-testid={`consent-widget-accordion-content-${consent.name}`}
			>
				{consentTypes[consent.name]?.description ?? consent.description}
			</ConsentWidgetAccordionContent>
		</ConsentWidgetAccordionItem>
	));
};

const ConsentWidgetAccordionItem = forwardRef<
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

const AccordionTriggerInner = ConsentWidgetAccordionTriggerInner;
const AccordionTrigger = ConsentWidgetAccordionTrigger;
const AccordionContent = ConsentWidgetAccordionContent;
const AccordionArrow = ConsentWidgetAccordionArrow;
const Accordion = ConsentWidgetAccordion;
const Switch = ConsentWidgetSwitch;
const AccordionItems = ConsentWidgetAccordionItems;
const AccordionItem = ConsentWidgetAccordionItem;

export {
	ConsentWidgetAccordionTrigger,
	ConsentWidgetAccordionTriggerInner,
	ConsentWidgetAccordionContent,
	ConsentWidgetAccordionArrow,
	ConsentWidgetAccordion,
	ConsentWidgetSwitch,
	ConsentWidgetAccordionItems,
	ConsentWidgetAccordionItem,
	AccordionTrigger,
	AccordionTriggerInner,
	AccordionContent,
	AccordionArrow,
	Accordion,
	Switch,
	AccordionItems,
	AccordionItem,
};
