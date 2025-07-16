'use client';

import {
	type ComponentProps,
	type ComponentPropsWithoutRef,
	type ComponentRef,
	type ReactNode,
	createContext,
	forwardRef,
	useContext,
	useEffect,
	useId,
	useMemo,
	useState,
} from 'react';
import { cn } from '../lib/cn';
import * as Unstyled from './tabs.unstyled';

type CollectionKey = string | symbol;

interface TabsProps
	extends Omit<
		ComponentProps<typeof Unstyled.Tabs>,
		'value' | 'onValueChange'
	> {
	/**
	 * Use simple mode instead of advanced usage as documented in https://radix-ui.com/primitives/docs/components/tabs.
	 */
	items?: string[];

	/**
	 * Shortcut for `defaultValue` when `items` is provided.
	 *
	 * @defaultValue 0
	 */
	defaultIndex?: number;

	/**
	 * Additional label in tabs list when `items` is provided.
	 */
	label?: ReactNode;
}

const TabsContext = createContext<{
	items?: string[];
	collection: CollectionKey[];
} | null>(null);

function useTabContext() {
	const ctx = useContext(TabsContext);
	if (!ctx) {
		throw new Error('You must wrap your component in <Tabs>');
	}
	return ctx;
}

const TabsList = forwardRef<
	ComponentRef<typeof Unstyled.TabsList>,
	ComponentPropsWithoutRef<typeof Unstyled.TabsList>
>((props, ref) => (
	<Unstyled.TabsList
		ref={ref}
		{...props}
		className={cn('flex items-center', props.className)}
	/>
));
TabsList.displayName = 'TabsList';

const TabsTrigger = forwardRef<
	ComponentRef<typeof Unstyled.TabsTrigger>,
	ComponentPropsWithoutRef<typeof Unstyled.TabsTrigger>
>((props, ref) => (
	<Unstyled.TabsTrigger
		ref={ref}
		{...props}
		className={cn(
			'flex cursor-pointer items-center gap-2 border-b-2 px-4 py-3 font-medium text-sm transition-all duration-200',
			// Inactive state
			'border-none text-base-600 hover:text-base-800 dark:text-base-400 dark:hover:text-base-200',
			// Active state
			'data-[state=active]:border-sky-600 data-[state=active]:text-sky-600 data-[state=active]:dark:border-sky-400 data-[state=active]:dark:text-sky-300',
			props.className
		)}
	/>
));
TabsTrigger.displayName = 'TabsTrigger';

export function Tabs({
	ref,
	className,
	items,
	label,
	defaultIndex = 0,
	defaultValue = items ? escapeValue(items[defaultIndex]) : undefined,
	...props
}: TabsProps) {
	const [value, setValue] = useState(defaultValue);
	const collection = useMemo<CollectionKey[]>(() => [], []);

	return (
		<Unstyled.Tabs
			ref={ref}
			className={cn(
				'my-4 overflow-hidden rounded-2xl bg-white p-1 outline outline-base-200 dark:bg-base-900 dark:outline-base-800',
				className
			)}
			value={value}
			onValueChange={(v: string) => {
				if (items && !items.some((item) => escapeValue(item) === v)) {
					return;
				}
				setValue(v);
			}}
			{...props}
		>
			{items && (
				<TabsList>
					{label && (
						<span className="my-auto me-auto font-medium text-sm">{label}</span>
					)}
					{items.map((item) => (
						<TabsTrigger key={item} value={escapeValue(item)}>
							{item}
						</TabsTrigger>
					))}
				</TabsList>
			)}
			<TabsContext.Provider
				value={useMemo(() => ({ items, collection }), [collection, items])}
			>
				{props.children}
			</TabsContext.Provider>
		</Unstyled.Tabs>
	);
}

interface TabProps
	extends Omit<ComponentProps<typeof Unstyled.TabsContent>, 'value'> {
	/**
	 * Value of tab, detect from index if unspecified.
	 */
	value?: string;
}

export function Tab({ value, ...props }: TabProps) {
	const { items } = useTabContext();
	const resolved =
		value ??
		// eslint-disable-next-line react-hooks/rules-of-hooks -- `value` is not supposed to change
		items?.at(useCollectionIndex());

	if (!resolved) {
		throw new Error(
			'Failed to resolve tab `value`, please pass a `value` prop to the Tab component.'
		);
	}

	return (
		<TabsContent value={escapeValue(resolved)} {...props}>
			{props.children}
		</TabsContent>
	);
}

function TabsContent({
	value,
	className,
	...props
}: ComponentProps<typeof Unstyled.TabsContent>) {
	return (
		<Unstyled.TabsContent
			value={value}
			forceMount
			className={cn(
				'scrollbar-hide relative data-[state=inactive]:hidden',
				className
			)}
			{...props}
		>
			{props.children}
		</Unstyled.TabsContent>
	);
}

/**
 * Inspired by Headless UI.
 *
 * Return the index of children, this is made possible by registering the order of render from children using React context.
 * This is supposed by work with pre-rendering & pure client-side rendering.
 */
function useCollectionIndex() {
	const key = useId();
	const { collection } = useTabContext();

	useEffect(() => {
		return () => {
			const idx = collection.indexOf(key);
			if (idx !== -1) {
				collection.splice(idx, 1);
			}
		};
	}, [key, collection]);

	if (!collection.includes(key)) {
		collection.push(key);
	}
	return collection.indexOf(key);
}

/**
 * only escape whitespaces in values in simple mode
 */
function escapeValue(v: string): string {
	return v.toLowerCase().replace(/\s/, '-');
}
