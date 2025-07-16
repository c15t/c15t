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
import { cn } from '../../lib/cn';
import * as Unstyled from '../ui/tabs-unstyled';

type CollectionKey = string | symbol;

/**
 * Enhanced tabs component properties
 *
 * @interface TabsProps
 */
interface TabsProps
	extends Omit<
		ComponentProps<typeof Unstyled.Tabs>,
		'value' | 'onValueChange'
	> {
	/**
	 * Use simple mode with predefined items instead of advanced composition
	 *
	 * @example ['JavaScript', 'TypeScript', 'Python']
	 */
	items?: string[];

	/**
	 * Default selected tab index when using items mode
	 *
	 * @defaultValue 0
	 */
	defaultIndex?: number;

	/**
	 * Optional label displayed before tab triggers
	 */
	label?: ReactNode;
}

/**
 * Tab context for managing collection state
 */
const TabsContext = createContext<{
	items?: string[];
	collection: CollectionKey[];
} | null>(null);

/**
 * Hook to access tab context safely
 *
 * @returns The tab context
 * @throws {Error} When used outside of Tabs component
 */
function useTabContext() {
	const ctx = useContext(TabsContext);
	if (!ctx) {
		throw new Error('You must wrap your component in <Tabs>');
	}
	return ctx;
}

/**
 * Styled tabs list component
 */
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

/**
 * Styled tabs trigger component
 */
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

/**
 * Enhanced tabs component with both simple and advanced modes
 *
 * Simple mode example:
 * ```tsx
 * <Tabs items={['JavaScript', 'TypeScript']} defaultIndex={0}>
 *   <Tab>JavaScript content</Tab>
 *   <Tab>TypeScript content</Tab>
 * </Tabs>
 * ```
 *
 * Advanced mode example:
 * ```tsx
 * <Tabs>
 *   <TabsList>
 *     <TabsTrigger value="js">JavaScript</TabsTrigger>
 *     <TabsTrigger value="ts">TypeScript</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="js">JavaScript content</TabsContent>
 *   <TabsContent value="ts">TypeScript content</TabsContent>
 * </Tabs>
 * ```
 *
 * @param props - The tabs properties
 * @returns The tabs JSX element
 */
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

/**
 * Tab content component properties
 *
 * @interface TabProps
 */
interface TabProps
	extends Omit<ComponentProps<typeof Unstyled.TabsContent>, 'value'> {
	/**
	 * Value of tab, auto-detected from index if unspecified in simple mode
	 */
	value?: string;
}

/**
 * Tab content component
 *
 * Automatically resolves tab value in simple mode based on render order.
 *
 * @param props - The tab properties
 * @returns The tab content JSX element
 * @throws {Error} When value cannot be resolved
 */
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

/**
 * Styled tabs content component
 */
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
 * Collection index hook for automatic tab value resolution
 *
 * Uses React's render order to determine tab index in simple mode.
 * Inspired by Headless UI's collection pattern.
 *
 * @returns The current tab index
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
 * Escape whitespaces in tab values for simple mode
 *
 * @param valueInput - The raw tab value
 * @returns The escaped value suitable for use as tab identifier
 */
function escapeValue(valueInput: string): string {
	return valueInput.toLowerCase().replace(/\s+/g, '-');
}
