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

import { useTranslations } from '~/component-hooks/use-translations';
import { Box } from '~/components/shared/primitives/box';
import type { BoxProps } from '~/components/shared/primitives/box';
import { LucideIcon } from '~/components/shared/ui/icon';
import * as PreferenceItem from '~/components/shared/ui/preference-item';
import * as RadixSwitch from '~/components/shared/ui/switch';
import { useConsentDraftSlice, useConsentDraftStore } from '~/draft';
import { useExplicitChoice, useRestrictions } from '~/hooks';
import { useTheme } from '~/hooks/use-theme';
import { useDisplayedCategories } from '~/kernel-selector';

import { ConsentWidgetVendorList } from './vendor-list';

/** Stock metadata for each category the preference surface can list. */
const DEFAULT_CONSENT_TYPES: readonly ConsentType[] = [
	{
		defaultValue: true,
		description: 'Required for basic site functionality',
		disabled: true,
		display: true,
		gdprType: 1,
		name: 'necessary',
	},
	{
		defaultValue: false,
		description: 'Enables enhanced features',
		display: true,
		gdprType: 2,
		name: 'functionality',
	},
	{
		defaultValue: false,
		description: 'Analytics and performance measurement',
		display: true,
		gdprType: 4,
		name: 'measurement',
	},
	{
		defaultValue: false,
		description: 'Improves your experience',
		display: true,
		gdprType: 3,
		name: 'experience',
	},
	{
		defaultValue: false,
		description: 'Advertising and marketing',
		display: true,
		gdprType: 5,
		name: 'marketing',
	},
];

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

// Created once: a component type made during render would remount the icon
// on every render.
const OpenIcon = LucideIcon({
	iconPath: <path d="M5 12h14M12 5v14" />,
	title: 'Open',
});
const CloseIcon = LucideIcon({
	iconPath: <path d="M5 12h14" />,
	title: 'Close',
});

const formatConsentName = function formatConsentName(name: AllConsentNames) {
	return name
		.replace(/_/gu, ' ')
		.replace(/\b\w/gu, (c: string) => c.toUpperCase());
};

interface ConsentWidgetAccordionRowProps {
	consent: ConsentType;
	title: string;
	description: string;
	restricted: boolean;
	open: boolean;
	noStyle?: boolean;
	onToggleItem: (value: string, open: boolean) => void;
}

/**
 * One category row. It subscribes to its own draft value, so staging a
 * toggle re-renders only the row that changed.
 */
const ConsentWidgetAccordionRow = ({
	consent,
	title,
	description,
	restricted,
	open,
	noStyle,
	onToggleItem,
}: ConsentWidgetAccordionRowProps) => {
	const draft = useConsentDraftStore();
	const checked = useConsentDraftSlice(
		draft,
		(snapshot) => snapshot.values[consent.name]
	);

	return (
		<PreferenceItem.Root
			className={noStyle ? undefined : accordionStyles.item}
			data-testid={`consent-widget-accordion-item-${consent.name}`}
			noStyle
			onOpenChange={(next) => onToggleItem(consent.name, next)}
			open={open}
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
					<ConsentWidgetAccordionArrow
						className={noStyle ? undefined : accordionStyles.arrow}
						data-testid={`consent-widget-accordion-arrow-${consent.name}`}
						noStyle
						slotKey="accordion.arrow"
					>
						{open ? <CloseIcon /> : <OpenIcon />}
					</ConsentWidgetAccordionArrow>
					<PreferenceItem.Header
						noStyle
						slotKey="accordion.header"
					>
						<PreferenceItem.Title
							className={noStyle ? undefined : accordionStyles.title}
							noStyle
							slotKey="accordion.title"
						>
							{title}
						</PreferenceItem.Title>
					</PreferenceItem.Header>
				</ConsentWidgetAccordionTriggerInner>

				<PreferenceItem.Control
					className={noStyle ? undefined : accordionStyles.control}
					noStyle
					slotKey="accordion.control"
				>
					<ConsentWidgetSwitch
						aria-label={title}
						checked={checked}
						aria-describedby={
							restricted ? `c15t-restriction-${consent.name}` : undefined
						}
						onCheckedChange={(value) => draft.set(consent.name, value)}
						disabled={consent.disabled}
						size="small"
						data-testid={`consent-widget-switch-${consent.name}`}
					/>
				</PreferenceItem.Control>
			</ConsentWidgetAccordionTrigger>
			{restricted ? (
				<output
					className={noStyle ? undefined : accordionStyles.restriction}
					data-testid={`consent-widget-restriction-${consent.name}`}
					id={`c15t-restriction-${consent.name}`}
				>
					Your saved choice is restricted by the current privacy settings.
				</output>
			) : null}
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
				{description}
				<ConsentWidgetVendorList
					category={consent.name}
					noStyle={noStyle}
				/>
			</ConsentWidgetAccordionContent>
		</PreferenceItem.Root>
	);
};

const ConsentWidgetAccordionItems = () => {
	const displayedCategories = useDisplayedCategories();
	const explicitChoice = useExplicitChoice();
	const restrictions = useRestrictions();
	// Only a saved grant that the current policy or a privacy signal
	// overrides is "restricted". An unsaved draft toggle is not.
	const isRestricted = function isRestricted(name: AllConsentNames): boolean {
		if (name === 'necessary') {
			return false;
		}
		const decision = explicitChoice?.categories[name];
		return decision?.value === true && (restrictions[name]?.length ?? 0) > 0;
	};
	const { noStyle, onToggleItem, openValues } =
		useConsentWidgetAccordionContext();
	const { consentTypes } = useTranslations();
	const consents = useMemo(() => {
		const allowed = new Set(displayedCategories);
		return DEFAULT_CONSENT_TYPES.filter((type) => allowed.has(type.name));
	}, [displayedCategories]);

	return consents.map((consent) => (
		<ConsentWidgetAccordionRow
			key={consent.name}
			consent={consent}
			description={
				consentTypes[consent.name]?.description ?? consent.description
			}
			noStyle={noStyle}
			onToggleItem={onToggleItem}
			open={openValues.includes(consent.name)}
			restricted={isRestricted(consent.name)}
			title={
				consentTypes[consent.name]?.title ?? formatConsentName(consent.name)
			}
		/>
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
const VendorList = ConsentWidgetVendorList;

export {
	ConsentWidgetVendorList,
	VendorList,
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
