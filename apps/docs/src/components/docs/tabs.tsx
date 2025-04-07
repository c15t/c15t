'use client';

import type {
	TabsProps as BaseProps,
	TabsContentProps,
} from '@radix-ui/react-tabs';
import {
	createContext,
	useContext,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { cn } from '~/lib/cn';
// biome-ignore lint/nursery/noExportedImports: <explanation>
import * as Primitive from '../ui/tabs';

export { Primitive };

type ChangeListener = (v: string) => void;
const listeners = new Map<string, ChangeListener[]>();

function addChangeListener(id: string, listener: ChangeListener): void {
	const list = listeners.get(id) ?? [];
	list.push(listener);
	listeners.set(id, list);
}

function removeChangeListener(id: string, listener: ChangeListener): void {
	const list = listeners.get(id) ?? [];
	listeners.set(
		id,
		list.filter((item) => item !== listener)
	);
}

export interface TabsProps extends BaseProps {
	/**
	 * Identifier for Sharing value of tabs
	 */
	groupId?: string;

	/**
	 * Enable persistent
	 */
	persist?: boolean;
	/**
	 * @defaultValue 0
	 */
	defaultIndex?: number;

	items?: string[];

	/**
	 * If true, updates the URL hash based on the tab's id
	 */
	updateAnchor?: boolean;
}

const TabsContext = createContext<{
	items: string[];
	valueToIdMap: Map<string, string>;
	collection: CollectionType;
} | null>(null);

export function Tabs({
	groupId,
	items = [],
	persist = false,
	defaultIndex = 0,
	updateAnchor = false,
	...props
}: TabsProps) {
	const values = useMemo(() => items.map((item) => toValue(item)), [items]);
	const [value, setValue] = useState(values[defaultIndex]);

	const valueToIdMap = useMemo(() => new Map<string, string>(), []);
	// eslint-disable-next-line react-hooks/exhaustive-deps -- re-reconstruct the collection if items changed
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	const collection = useMemo(() => createCollection(), [items]);

	const onChange: ChangeListener = (v) => {
		if (values.includes(v)) {
			setValue(v);
		}
	};

	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	useLayoutEffect(() => {
		if (!groupId) {
			return;
		}
		const onUpdate: ChangeListener = (v) => onChangeRef.current(v);

		const previous = persist
			? localStorage.getItem(groupId)
			: sessionStorage.getItem(groupId);

		if (previous) {
			onUpdate(previous);
		}
		addChangeListener(groupId, onUpdate);
		return () => {
			removeChangeListener(groupId, onUpdate);
		};
	}, [groupId, persist]);

	useLayoutEffect(() => {
		const hash = window.location.hash.slice(1);
		if (!hash) {
			return;
		}

		for (const [value, id] of valueToIdMap.entries()) {
			if (id === hash) {
				setValue(value);
				break;
			}
		}
	}, [valueToIdMap]);

	return (
		<Primitive.Tabs
			value={value}
			// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: okay with the complexity of 16 out of 15
			onValueChange={(v: string) => {
				if (updateAnchor) {
					const id = valueToIdMap.get(v);

					if (id) {
						window.history.replaceState(null, '', `#${id}`);
					}
				}
				if (groupId) {
					for (const item of listeners.get(groupId) ?? []) {
						item(v);
					}

					if (persist) {
						localStorage.setItem(groupId, v);
					} else {
						sessionStorage.setItem(groupId, v);
					}
				} else {
					setValue(v);
				}
			}}
			{...props}
			className={cn(
				'my-4 overflow-hidden rounded-xl border bg-fd-card shadow-sm',
				'ring-1 ring-fd-primary/5',
				props.className
			)}
		>
			<Primitive.TabsList
				className={cn(
					'flex h-13 flex-row items-center gap-2 px-4 py-2',
					'border-fd-primary/10 border-b',
					'bg-gradient-to-b from-fd-background/80 to-transparent',
					'shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]'
				)}
			>
				{values.map((v, i) => (
					<Primitive.TabsTrigger
						key={v}
						value={v}
						className={cn(
							'relative px-3 py-1.5 font-medium text-sm transition-all duration-200',
							'text-fd-muted-foreground hover:text-fd-foreground',
							'rounded-md',
							'bg-transparent',
							'data-[state=active]:bg-fd-primary/[0.08]',
							'data-[state=active]:text-fd-primary',
							'data-[state=active]:shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]',
							'data-[state=active]:border-fd-primary/20',
							'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-primary/20',
							'disabled:pointer-events-none disabled:opacity-50'
						)}
					>
						{items[i]}
					</Primitive.TabsTrigger>
				))}
			</Primitive.TabsList>

			<TabsContext.Provider
				value={useMemo(
					() => ({ items, valueToIdMap, collection }),
					[valueToIdMap, collection, items]
				)}
			>
				{props.children}
			</TabsContext.Provider>
		</Primitive.Tabs>
	);
}

function toValue(v: string): string {
	// biome-ignore lint/performance/useTopLevelRegex: <explanation>
	return v.toLowerCase().replace(/\s/, '-');
}

export type TabProps = Omit<TabsContentProps, 'value'> & {
	/**
	 * Value of tab, detect from index if unspecified.
	 */
	value?: TabsContentProps['value'];
};

export function Tab({ value, className, ...props }: TabProps) {
	const ctx = useContext(TabsContext);
	const resolvedValue =
		value ??
		// eslint-disable-next-line react-hooks/rules-of-hooks -- `value` is not supposed to change
		// biome-ignore lint/correctness/useHookAtTopLevel: <explanation>
		ctx?.items.at(useCollectionIndex());
	if (!resolvedValue) {
		throw new Error(
			'Failed to resolve tab `value`, please pass a `value` prop to the Tab component.'
		);
	}

	const v = toValue(resolvedValue);

	if (props.id && ctx) {
		ctx.valueToIdMap.set(v, props.id);
	}

	return (
		<Primitive.TabsContent
			value={v}
			className={cn(
				'prose-no-margin p-4 transition-all duration-200',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-primary/20',
				'[&>figure:only-child]:-m-4 [&>figure:only-child]:rounded-none [&>figure:only-child]:border-none',
				'data-[state=inactive]:hidden',
				'bg-gradient-to-b from-transparent to-fd-primary/[0.02]',
				className
			)}
			{...props}
		>
			{props.children}
		</Primitive.TabsContent>
	);
}

type CollectionKey = string | symbol;
type CollectionType = ReturnType<typeof createCollection>;

function createCollection() {
	return [] as CollectionKey[];
}

/**
 * Inspired by Headless UI.
 *
 * Return the index of children, this is made possible by registering the order of render from children using React context.
 * This is supposed by work with pre-rendering & pure client-side rendering.
 */
function useCollectionIndex() {
	// biome-ignore lint/correctness/useHookAtTopLevel: <explanation>
	const key = useId();
	// biome-ignore lint/correctness/useHookAtTopLevel: <explanation>
	const ctx = useContext(TabsContext);
	if (!ctx) {
		throw new Error('You must wrap your component in <Tabs>');
	}

	const list = ctx.collection;

	function register() {
		if (!list.includes(key)) {
			list.push(key);
		}
	}

	function unregister() {
		const idx = list.indexOf(key);
		if (idx !== -1) {
			list.splice(idx, 1);
		}
	}

	// biome-ignore lint/correctness/useHookAtTopLevel: <explanation>
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useMemo(() => {
		// re-order the item to the bottom if registered
		unregister();
		register();
		// eslint-disable-next-line -- register
	}, [list]);

	// biome-ignore lint/correctness/useHookAtTopLevel: <explanation>
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		return unregister;
		// eslint-disable-next-line -- clean up only
	}, []);

	return list.indexOf(key);
}
