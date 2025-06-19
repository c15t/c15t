'use client';
import type {
	PopoverContentProps,
	PopoverTriggerProps,
} from '@radix-ui/react-popover';
import type { TOCItemType } from 'fumadocs-core/server';
import * as Primitive from 'fumadocs-core/toc';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { usePageStyles } from 'fumadocs-ui/contexts/layout';
import { ChevronRight, Text } from 'lucide-react';
import {
	type ComponentProps,
	createContext,
	type HTMLAttributes,
	type ReactNode,
	use,
	useMemo,
	useRef,
} from 'react';
import { cn } from '../../lib/cn';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '../ui/collapsible';
import { ScrollArea, ScrollViewport } from '../ui/scroll-area';
import { TocThumb } from './toc-thumb';

export interface TOCProps {
	/**
	 * Custom content in TOC container, before the main TOC
	 */
	header?: ReactNode;

	/**
	 * Custom content in TOC container, after the main TOC
	 */
	footer?: ReactNode;

	children: ReactNode;
}

export function Toc(props: HTMLAttributes<HTMLDivElement>) {
	const { toc } = usePageStyles();

	return (
		<div
			id="nd-toc"
			{...props}
			className={cn(
				'sticky top-[calc(var(--fd-banner-height)+var(--fd-nav-height))] h-(--fd-toc-height) pt-12 pb-2',
				toc,
				props.className
			)}
			style={
				{
					...props.style,
					'--fd-toc-height':
						'calc(100dvh - var(--fd-banner-height) - var(--fd-nav-height))',
				} as object
			}
		>
			<div className="flex h-full w-(--fd-toc-width) max-w-full flex-col gap-3 pe-4">
				{props.children}
			</div>
		</div>
	);
}

export function TocItemsEmpty() {
	const { text } = useI18n();

	return (
		<div className="rounded-lg border bg-fd-card p-3 text-fd-muted-foreground text-xs">
			{text.tocNoHeadings}
		</div>
	);
}

export function TOCScrollArea({
	isMenu,
	...props
}: ComponentProps<typeof ScrollArea> & { isMenu?: boolean }) {
	const viewRef = useRef<HTMLDivElement>(null);

	return (
		<ScrollArea
			{...props}
			className={cn('flex flex-col ps-px', props.className)}
		>
			<Primitive.ScrollProvider containerRef={viewRef}>
				<ScrollViewport
					className={cn(
						'relative min-h-0 text-sm',
						isMenu && 'mx-4 mt-2 mb-4 md:mx-6'
					)}
					ref={viewRef}
				>
					{props.children}
				</ScrollViewport>
			</Primitive.ScrollProvider>
		</ScrollArea>
	);
}

export function TOCItems({ items }: { items: TOCItemType[] }) {
	const containerRef = useRef<HTMLDivElement>(null);

	if (items.length === 0) {
		return <TocItemsEmpty />;
	}

	return (
		<>
			<TocThumb
				containerRef={containerRef}
				className="absolute start-0 mt-(--fd-top) h-(--fd-height) w-px bg-fd-primary transition-all"
			/>
			<div
				ref={containerRef}
				className="flex flex-col border-fd-foreground/10 border-s"
			>
				{items.map((item) => (
					<TOCItem key={item.url} item={item} />
				))}
			</div>
		</>
	);
}

function TOCItem({ item }: { item: TOCItemType }) {
	return (
		<Primitive.TOCItem
			href={item.url}
			className={cn(
				'prose py-1.5 text-fd-muted-foreground text-sm transition-colors [overflow-wrap:anywhere] first:pt-0 last:pb-0 data-[active=true]:text-fd-primary',
				item.depth <= 2 && 'ps-3',
				item.depth === 3 && 'ps-6',
				item.depth >= 4 && 'ps-8'
			)}
		>
			{item.title}
		</Primitive.TOCItem>
	);
}

type MakeRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

const Context = createContext<{
	open: boolean;
	setOpen: (open: boolean) => void;
} | null>(null);

const TocProvider = Context.Provider || Context;

export function TocPopover({
	open,
	onOpenChange,
	ref: _ref,
	...props
}: MakeRequired<ComponentProps<typeof Collapsible>, 'open' | 'onOpenChange'>) {
	return (
		<Collapsible open={open} onOpenChange={onOpenChange} {...props}>
			<TocProvider
				value={useMemo(
					() => ({
						open,
						setOpen: onOpenChange,
					}),
					[onOpenChange, open]
				)}
			>
				{props.children}
			</TocProvider>
		</Collapsible>
	);
}

export function TocPopoverTrigger({
	items,
	...props
}: PopoverTriggerProps & { items: TOCItemType[] }) {
	const { text } = useI18n();
	const context = use(Context);
	const open = context?.open ?? false;
	const active = Primitive.useActiveAnchor();
	const current = useMemo(() => {
		return items.find((item) => active === item.url.slice(1))?.title;
	}, [items, active]);

	return (
		<CollapsibleTrigger
			{...props}
			className={cn(
				'inline-flex items-center gap-2 text-nowrap px-4 py-2.5 text-start text-sm focus-visible:outline-none md:px-6',
				props.className
			)}
		>
			<Text className="size-4 shrink-0" />
			{text.toc}
			<ChevronRight
				className={cn(
					'size-4 shrink-0 text-fd-muted-foreground transition-all',
					!current && 'opacity-0',
					open ? 'rotate-90' : '-ms-1.5'
				)}
			/>
			<span
				className={cn(
					'-ms-1.5 truncate text-fd-muted-foreground transition-opacity',
					(!current || open) && 'opacity-0'
				)}
			>
				{current}
			</span>
		</CollapsibleTrigger>
	);
}

export function TocPopoverContent(props: PopoverContentProps) {
	return (
		<CollapsibleContent
			data-toc-popover=""
			className="flex max-h-[50vh] flex-col"
			{...props}
		>
			{props.children}
		</CollapsibleContent>
	);
}
