import type { AllConsentNames, ConsentType } from '@c15t/core';
import accordionStyles from '@c15t/ui/styles/components/accordion';
import {
	createContext,
	forwardRef as createForwardRef,
	useCallback,
	useContext,
	useMemo,
} from 'react';
import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react';

import { useConsentManager } from '~/component-hooks/use-consent-manager';
import { useTranslations } from '~/component-hooks/use-translations';
import { Box } from '~/components/shared/primitives/box';
import type { BoxProps } from '~/components/shared/primitives/box';
import { LucideIcon } from '~/components/shared/ui/icon';
import * as PreferenceItem from '~/components/shared/ui/preference-item';
import * as RadixSwitch from '~/components/shared/ui/switch';
import { useTheme } from '~/hooks/use-theme';

interface ConsentWidgetAccordionContextValue {
	noStyle?: boolean;
	onToggleItem: (value: string, open: boolean) => void;
	openValues: string[];
}

const ConsentWidgetAccordionContext =
	createContext<ConsentWidgetAccordionContextValue | null>(null);

const useConsentWidgetAccordionContext =
	function useConsentWidgetAccordionContext() {
		const context = useContext(ConsentWidgetAccordionContext);

		if (!context) {
			throw new Error(
				'ConsentWidgetAccordion components must be used within ConsentWidgetAccordion'
			);
		}

		return context;
	};

const ConsentWidgetAccordionTrigger = createForwardRef<
	HTMLDivElement,
	BoxProps
>(({ children, ...props }, ref) => (
	<Box
		ref={ref as Ref<HTMLDivElement>}
		baseClassName={accordionStyles.triggerRow}
		{...props}
	>
		{children}
	</Box>
));
ConsentWidgetAccordionTrigger.displayName = 'ConsentWidgetAccordionTrigger';

const ConsentWidgetAccordionTriggerInner = PreferenceItem.Trigger;
const ConsentWidgetAccordionContent = PreferenceItem.Content;
const ConsentWidgetAccordionArrow = PreferenceItem.Leading;
const ConsentWidgetSwitch = RadixSwitch.Root;

type ConsentWidgetAccordionProps = Omit<BoxProps, 'slotKey'> & {
	'data-testid'?: string;
	children: ReactNode;
	onValueChange?: (value: string | string[]) => void;
	type?: 'multiple' | 'single';
	value?: string | string[];
};

const normalizeAccordionValue = (
	value: string | string[] | undefined
): string[] => {
	if (Array.isArray(value)) {
		return value;
	}
	return value ? [value] : [];
};

const ConsentWidgetAccordion = ({
	'data-testid': dataTestId,
	children,
	className,
	noStyle,
	onValueChange,
	style,
	type = 'multiple',
	value,
	...props
}: ConsentWidgetAccordionProps) => {
	const { noStyle: contextNoStyle } = useTheme();
	const finalNoStyle = noStyle ?? contextNoStyle;
	const openValues = useMemo(() => normalizeAccordionValue(value), [value]);

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

	const contextValue = useMemo(
		() => ({ noStyle: finalNoStyle, onToggleItem, openValues }),
		[finalNoStyle, onToggleItem, openValues]
	);

	return (
		<ConsentWidgetAccordionContext.Provider value={contextValue}>
			<Box
				className={className}
				data-testid={dataTestId ?? 'consent-widget-accordion'}
				noStyle={noStyle}
				style={style}
				slotKey="accordion.root"
				baseClassName={accordionStyles.list}
				{...props}
			>
				{children}
			</Box>
		</ConsentWidgetAccordionContext.Provider>
	);
};

const ConsentWidgetAccordionItems = () => {
	const { selectedConsents, setSelectedConsent, getDisplayedConsents } =
		useConsentManager();
	const { noStyle, onToggleItem, openValues } =
		useConsentWidgetAccordionContext();
	const handleConsentChange = useCallback(
		(name: AllConsentNames, checked: boolean) => {
			setSelectedConsent(name, checked);
		},
		[setSelectedConsent]
	);

	const formatConsentName = function formatConsentName(name: AllConsentNames) {
		return name
			.replace(/_/gu, ' ')
			.replace(/\b\w/gu, (c: string) => c.toUpperCase());
	};

	const { consentTypes } = useTranslations();

	return getDisplayedConsents().map((consent: ConsentType) => (
		<PreferenceItem.Root
			key={consent.name}
			className={noStyle ? undefined : accordionStyles.item}
			data-testid={`consent-widget-accordion-item-${consent.name}`}
			noStyle
			onOpenChange={(open) => onToggleItem(consent.name, open)}
			open={openValues.includes(consent.name)}
			slotKey="accordion-item.root"
		>
			<ConsentWidgetAccordionTrigger slotKey="accordion.triggerRow">
				{/* The testid names the button, not the row that holds it,
				    so it means the same element in every adapter. */}
				<ConsentWidgetAccordionTriggerInner
					className={noStyle ? undefined : accordionStyles.trigger}
					data-testid={`consent-widget-accordion-trigger-${consent.name}`}
					noStyle
					slotKey="accordion-item.trigger"
				>
					{(() => {
						const ArrowIcon = LucideIcon({
							iconPath: openValues.includes(consent.name) ? (
								<path d="M5 12h14" />
							) : (
								<path d="M5 12h14M12 5v14" />
							),
							title: openValues.includes(consent.name) ? 'Close' : 'Open',
						});

						return (
							<ConsentWidgetAccordionArrow
								className={noStyle ? undefined : accordionStyles.arrow}
								data-testid={`consent-widget-accordion-arrow-${consent.name}`}
								noStyle
								slotKey="accordion.arrow"
							>
								<ArrowIcon />
							</ConsentWidgetAccordionArrow>
						);
					})()}
					<PreferenceItem.Header
						noStyle
						slotKey="accordion.header"
					>
						<PreferenceItem.Title
							className={noStyle ? undefined : accordionStyles.title}
							noStyle
							slotKey="accordion.title"
						>
							{consentTypes[consent.name]?.title ??
								formatConsentName(consent.name)}
						</PreferenceItem.Title>
					</PreferenceItem.Header>
				</ConsentWidgetAccordionTriggerInner>

				<PreferenceItem.Control
					className={noStyle ? undefined : accordionStyles.control}
					noStyle
					slotKey="accordion.control"
				>
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
				className={noStyle ? undefined : accordionStyles.content}
				data-testid={`consent-widget-accordion-content-${consent.name}`}
				innerClassName={noStyle ? undefined : accordionStyles.contentInner}
				innerSlotKey="accordion.contentInner"
				slotKey="accordion-item.content"
				viewportClassName={
					noStyle ? undefined : accordionStyles.contentViewport
				}
				viewportSlotKey="accordion.contentViewport"
			>
				{consentTypes[consent.name]?.description ?? consent.description}
			</ConsentWidgetAccordionContent>
		</PreferenceItem.Root>
	));
};

const ConsentWidgetAccordionItem = createForwardRef<
	HTMLDivElement,
	ComponentPropsWithoutRef<typeof PreferenceItem.Root>
>(({ className, ...rest }, forwardedRef) => (
	<PreferenceItem.Root
		ref={forwardedRef}
		className={[accordionStyles.item, className].filter(Boolean).join(' ')}
		noStyle
		{...rest}
	/>
));
ConsentWidgetAccordionItem.displayName = 'ConsentWidgetAccordionItem';

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
