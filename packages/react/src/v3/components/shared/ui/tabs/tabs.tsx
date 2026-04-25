'use client';

import { getDataDisabled } from '@c15t/ui/primitives/data-state';
import {
	getNextTabValue,
	getTabPanelState,
	getTabState,
	type TabsOrientation,
} from '@c15t/ui/primitives/tabs';
import {
	type TabsVariantsProps,
	tabsVariants,
} from '@c15t/ui/styles/primitives/tabs';
import {
	createContext,
	forwardRef,
	type HTMLAttributes,
	type KeyboardEvent,
	type ReactNode,
	type RefObject,
	useContext,
	useId,
	useMemo,
	useRef,
} from 'react';
import { useTheme } from '~/hooks/use-theme';
import { useControllableState } from '~/v3/components/shared/libs/use-controllable-state';

type TabsContextValue = {
	baseId: string;
	disabled?: boolean;
	loop: boolean;
	noStyle?: boolean;
	onValueChange: (value: string) => void;
	orientation: TabsOrientation;
	registerTrigger: (value: string, node: HTMLButtonElement | null) => void;
	value?: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
	const context = useContext(TabsContext);

	if (!context) {
		throw new Error('Tabs components must be used within TabsRoot');
	}

	return context;
}

export interface TabsRootProps
	extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'>,
		TabsVariantsProps {
	children: ReactNode;
	defaultValue?: string;
	disabled?: boolean;
	loop?: boolean;
	noStyle?: boolean;
	onValueChange?: (value: string) => void;
	value?: string;
}

const TabsRoot = forwardRef<HTMLDivElement, TabsRootProps>(
	(
		{
			children,
			className,
			defaultValue,
			disabled,
			loop = true,
			noStyle,
			onValueChange,
			orientation = 'horizontal',
			value,
			...rest
		},
		forwardedRef
	) => {
		const reactId = useId().replace(/:/g, '');
		const { noStyle: contextNoStyle } = useTheme();
		const variants = tabsVariants({ orientation });
		const [currentValue, setCurrentValue] = useControllableState({
			defaultValue: defaultValue ?? '',
			onChange: onValueChange,
			value,
		});
		const triggerRefs = useRef(new Map<string, HTMLButtonElement | null>());
		const finalNoStyle = contextNoStyle || noStyle;

		const contextValue = useMemo<TabsContextValue>(
			() => ({
				baseId: `c15t-tabs-${reactId}`,
				disabled,
				loop,
				noStyle: finalNoStyle,
				onValueChange: setCurrentValue,
				orientation,
				registerTrigger: (triggerValue, node) => {
					triggerRefs.current.set(triggerValue, node);
				},
				value: currentValue,
			}),
			[
				currentValue,
				disabled,
				finalNoStyle,
				loop,
				orientation,
				reactId,
				setCurrentValue,
			]
		);

		return (
			<TabsContext.Provider value={contextValue}>
				<div
					ref={forwardedRef}
					className={
						finalNoStyle ? className : variants.root({ class: className })
					}
					data-disabled={getDataDisabled(disabled)}
					data-orientation={orientation}
					data-slot="tabs-root"
					{...rest}
				>
					{children}
				</div>
			</TabsContext.Provider>
		);
	}
);

TabsRoot.displayName = 'TabsRoot';

export interface TabsListProps
	extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'>,
		TabsVariantsProps {
	noStyle?: boolean;
}

const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
	({ className, noStyle, orientation, ...rest }, forwardedRef) => {
		const { noStyle: contextNoStyle } = useTheme();
		const {
			disabled,
			noStyle: rootNoStyle,
			orientation: rootOrientation,
		} = useTabsContext();
		const finalOrientation = orientation ?? rootOrientation;
		const variants = tabsVariants({ orientation: finalOrientation });
		const finalNoStyle = rootNoStyle || contextNoStyle || noStyle;

		return (
			<div
				ref={forwardedRef}
				aria-orientation={finalOrientation}
				className={
					finalNoStyle ? className : variants.list({ class: className })
				}
				data-disabled={getDataDisabled(disabled)}
				data-orientation={finalOrientation}
				data-slot="tabs-list"
				role="tablist"
				{...rest}
			/>
		);
	}
);

TabsList.displayName = 'TabsList';

export interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
	noStyle?: boolean;
	value: string;
}

const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
	(
		{ children, className, noStyle, onClick, onKeyDown, value, ...rest },
		forwardedRef
	) => {
		const { noStyle: contextNoStyle } = useTheme();
		const variants = tabsVariants();
		const {
			baseId,
			disabled,
			loop,
			noStyle: rootNoStyle,
			onValueChange,
			orientation,
			registerTrigger,
			value: selectedValue,
		} = useTabsContext();
		const finalNoStyle = rootNoStyle || contextNoStyle || noStyle;
		const isSelected = selectedValue === value;
		const localRef = useRef<HTMLButtonElement | null>(null);

		const setRefs = (node: HTMLButtonElement | null) => {
			localRef.current = node;
			registerTrigger(value, node);
			if (typeof forwardedRef === 'function') {
				forwardedRef(node);
			} else if (forwardedRef) {
				forwardedRef.current = node;
			}
		};

		const moveFocus = (nextValue: string) => {
			onValueChange(nextValue);
			const nextButton =
				document.getElementById(`${baseId}-trigger-${nextValue}`) ?? null;
			if (nextButton instanceof HTMLButtonElement) {
				nextButton.focus();
			}
		};

		return (
			<button
				ref={setRefs}
				aria-controls={`${baseId}-content-${value}`}
				aria-selected={isSelected}
				className={
					finalNoStyle ? className : variants.trigger({ class: className })
				}
				data-disabled={getDataDisabled(disabled)}
				data-slot="tabs-trigger"
				data-state={getTabState(isSelected)}
				disabled={disabled}
				id={`${baseId}-trigger-${value}`}
				onClick={(event) => {
					onValueChange(value);
					onClick?.(event as never);
				}}
				onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
					const nextValue = getNextTabValue({
						currentValue: value,
						key: event.key,
						loop,
						orientation,
						triggerValues: Array.from(
							document.querySelectorAll<HTMLButtonElement>(
								`[data-slot="tabs-trigger"][id^="${baseId}-trigger-"]`
							)
						).map((button) => button.id.replace(`${baseId}-trigger-`, '')),
					});

					if (
						nextValue !== value ||
						event.key === 'Home' ||
						event.key === 'End'
					) {
						event.preventDefault();
						moveFocus(nextValue);
					}

					onKeyDown?.(event);
				}}
				role="tab"
				tabIndex={isSelected ? 0 : -1}
				type="button"
				{...rest}
			>
				{children}
			</button>
		);
	}
);

TabsTrigger.displayName = 'TabsTrigger';

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
	forceMount?: boolean;
	noStyle?: boolean;
	value: string;
}

const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
	(
		{ children, className, forceMount = false, noStyle, value, ...rest },
		forwardedRef
	) => {
		const { noStyle: contextNoStyle } = useTheme();
		const variants = tabsVariants();
		const {
			baseId,
			noStyle: rootNoStyle,
			value: selectedValue,
		} = useTabsContext();
		const finalNoStyle = rootNoStyle || contextNoStyle || noStyle;
		const isSelected = selectedValue === value;

		if (!forceMount && !isSelected) {
			return null;
		}

		return (
			<div
				ref={forwardedRef}
				aria-labelledby={`${baseId}-trigger-${value}`}
				className={
					finalNoStyle ? className : variants.content({ class: className })
				}
				data-slot="tabs-content"
				data-state={getTabPanelState(isSelected)}
				hidden={!isSelected}
				id={`${baseId}-content-${value}`}
				role="tabpanel"
				tabIndex={0}
				{...rest}
			>
				{children}
			</div>
		);
	}
);

TabsContent.displayName = 'TabsContent';

export {
	TabsContent as Content,
	TabsList as List,
	TabsRoot as Root,
	TabsTrigger as Trigger,
};
