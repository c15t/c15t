import styles from '@c15t/ui/styles/components/consent-widget.module.js';
import type { AllConsentNames, ConsentType } from 'c15t';
import {
	type ComponentPropsWithoutRef,
	createContext,
	forwardRef,
	type ReactNode,
	type Ref,
	useCallback,
	useContext,
} from 'react';
import { Box, type BoxProps } from '~/components/shared/primitives/box';
import { LucideIcon } from '~/components/shared/ui/icon';
import * as PreferenceItem from '~/components/shared/ui/preference-item';
import * as RadixSwitch from '~/components/shared/ui/switch';
import { useConsentManager } from '~/hooks/use-consent-manager';
import { useTranslations } from '~/hooks/use-translations';

type ConsentWidgetAccordionContextValue = {
	onToggleItem: (value: string, open: boolean) => void;
	openValues: string[];
};

const ConsentWidgetAccordionContext =
	createContext<ConsentWidgetAccordionContextValue | null>(null);

function useConsentWidgetAccordionContext() {
	const context = useContext(ConsentWidgetAccordionContext);

	if (!context) {
		throw new Error(
			'ConsentWidgetAccordion components must be used within ConsentWidgetAccordion'
		);
	}

	return context;
}

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

const ConsentWidgetAccordionTriggerInner = PreferenceItem.Trigger;
const ConsentWidgetAccordionContent = PreferenceItem.Content;
const ConsentWidgetAccordionArrow = PreferenceItem.Leading;
const ConsentWidgetSwitch = RadixSwitch.Root;

type ConsentWidgetAccordionProps = {
	children: ReactNode;
	onValueChange?: (value: string | string[]) => void;
	type?: 'multiple' | 'single';
	value?: string | string[];
};

const ConsentWidgetAccordion = ({
	children,
	onValueChange,
	type = 'multiple',
	value,
}: ConsentWidgetAccordionProps) => {
	const openValues = Array.isArray(value) ? value : value ? [value] : [];

	const onToggleItem = useCallback(
		(itemValue: string, open: boolean) => {
			if (type === 'single') {
				onValueChange?.(open ? itemValue : '');
				return;
			}

			const nextValues = open
				? [...new Set([...openValues, itemValue])]
				: openValues.filter((currentValue) => currentValue !== itemValue);

			onValueChange?.(nextValues);
		},
		[onValueChange, openValues, type]
	);

	return (
		<ConsentWidgetAccordionContext.Provider
			value={{ onToggleItem, openValues }}
		>
			<div className={styles.accordionList}>{children}</div>
		</ConsentWidgetAccordionContext.Provider>
	);
};

const ConsentWidgetAccordionItems = () => {
	const { selectedConsents, setSelectedConsent, getDisplayedConsents } =
		useConsentManager();
	const { onToggleItem, openValues } = useConsentWidgetAccordionContext();
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
		<PreferenceItem.Root
			key={consent.name}
			className={styles.accordionItem}
			data-testid={`consent-widget-accordion-item-${consent.name}`}
			noStyle
			onOpenChange={(open) => onToggleItem(consent.name, open)}
			open={openValues.includes(consent.name)}
		>
			<ConsentWidgetAccordionTrigger
				data-testid={`consent-widget-accordion-trigger-${consent.name}`}
			>
				<ConsentWidgetAccordionTriggerInner
					className={styles.accordionTriggerInner}
					data-testid={`consent-widget-accordion-trigger-inner-${consent.name}`}
					noStyle
				>
					{(() => {
						const ArrowIcon = LucideIcon({
							title: openValues.includes(consent.name) ? 'Close' : 'Open',
							iconPath: openValues.includes(consent.name) ? (
								<path d="M5 12h14" />
							) : (
								<path d="M5 12h14M12 5v14" />
							),
						});

						return (
							<ConsentWidgetAccordionArrow
								className={styles.accordionArrow}
								data-testid={`consent-widget-accordion-arrow-${consent.name}`}
								noStyle
							>
								<ArrowIcon className={styles.accordionArrowIcon} />
							</ConsentWidgetAccordionArrow>
						);
					})()}
					<PreferenceItem.Header noStyle>
						<PreferenceItem.Title className={styles.accordionTitle} noStyle>
							{consentTypes[consent.name]?.title ??
								formatConsentName(consent.name)}
						</PreferenceItem.Title>
					</PreferenceItem.Header>
				</ConsentWidgetAccordionTriggerInner>

				<PreferenceItem.Control className={styles.switch} noStyle>
					<ConsentWidgetSwitch
						aria-label={
							consentTypes[consent.name]?.title ??
							formatConsentName(consent.name)
						}
						checked={selectedConsents[consent.name]}
						onCheckedChange={(checked) =>
							handleConsentChange(consent.name, checked)
						}
						disabled={consent.disabled}
						size="small"
						data-testid={`consent-widget-switch-${consent.name}`}
					/>
				</PreferenceItem.Control>
			</ConsentWidgetAccordionTrigger>
			<ConsentWidgetAccordionContent
				className={styles.accordionContent}
				data-testid={`consent-widget-accordion-content-${consent.name}`}
			>
				{consentTypes[consent.name]?.description ?? consent.description}
			</ConsentWidgetAccordionContent>
		</PreferenceItem.Root>
	));
};

const ConsentWidgetAccordionItem = forwardRef<
	HTMLDivElement,
	ComponentPropsWithoutRef<typeof PreferenceItem.Root>
>(({ className, ...rest }, forwardedRef) => {
	return (
		<PreferenceItem.Root
			ref={forwardedRef}
			className={[styles.accordionItem, className].filter(Boolean).join(' ')}
			noStyle
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
};
