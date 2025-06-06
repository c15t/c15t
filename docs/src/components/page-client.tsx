'use client';

import {
	type BreadcrumbOptions,
	getBreadcrumbItemsFromPath,
} from 'fumadocs-core/breadcrumb';
import { usePathname } from 'fumadocs-core/framework';
import Link from 'fumadocs-core/link';
import type { PageTree } from 'fumadocs-core/server';
import { useEffectEvent } from 'fumadocs-core/utils/use-effect-event';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { useNav, usePageStyles } from 'fumadocs-ui/contexts/layout';
import { useSidebar } from 'fumadocs-ui/contexts/sidebar';
import { useTreeContext, useTreePath } from 'fumadocs-ui/contexts/tree';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
	Fragment,
	type HTMLAttributes,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { cn } from '../lib/cn';
import { isActive } from '../lib/is-active';
import { TocPopover } from './layout/toc';

export function TocPopoverHeader(props: HTMLAttributes<HTMLDivElement>) {
	const ref = useRef<HTMLElement>(null);
	const [open, setOpen] = useState(false);
	const sidebar = useSidebar();
	const { tocNav } = usePageStyles();
	const { isTransparent } = useNav();

	const onClick = useEffectEvent((e: Event) => {
		if (!open) {
			return;
		}

		if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
			setOpen(false);
		}
	});

	useEffect(() => {
		window.addEventListener('click', onClick);

		return () => {
			window.removeEventListener('click', onClick);
		};
	}, [onClick]);

	return (
		<div
			className={cn('sticky z-10 overflow-visible', tocNav, props.className)}
			style={{
				top: 'calc(var(--fd-banner-height) + var(--fd-nav-height))',
			}}
		>
			<TocPopover open={open} onOpenChange={setOpen} asChild>
				<header
					ref={ref}
					id="nd-tocnav"
					{...props}
					className={cn(
						'border-fd-foreground/10 border-b backdrop-blur-md transition-colors',
						(!isTransparent || open) && 'bg-fd-background/80',
						open && 'shadow-lg',
						sidebar.open && 'max-md:hidden'
					)}
				>
					{props.children}
				</header>
			</TocPopover>
		</div>
	);
}

export function PageBody(props: HTMLAttributes<HTMLDivElement>) {
	const { page } = usePageStyles();

	return (
		<div
			id="nd-page"
			{...props}
			className={cn('flex w-full min-w-0 flex-col', page, props.className)}
		>
			{props.children}
		</div>
	);
}

export function PageArticle(props: HTMLAttributes<HTMLElement>) {
	const { article } = usePageStyles();

	return (
		<article
			{...props}
			className={cn(
				'flex w-full flex-1 flex-col gap-6 px-4 pt-8 md:px-6 md:pt-12 xl:mx-auto xl:px-12',
				article,
				props.className
			)}
		>
			{props.children}
		</article>
	);
}

export function LastUpdate(props: { date: Date }) {
	const { text } = useI18n();
	const [date, setDate] = useState('');

	useEffect(() => {
		// to the timezone of client
		setDate(props.date.toLocaleDateString());
	}, [props.date]);

	return (
		<p className="text-fd-muted-foreground text-sm">
			{text.lastUpdate} {date}
		</p>
	);
}

type Item = Pick<PageTree.Item, 'name' | 'description' | 'url'>;
export interface FooterProps {
	/**
	 * Items including information for the next and previous page
	 */
	items?: {
		previous?: Item;
		next?: Item;
	};
}

function scanNavigationList(tree: PageTree.Node[]) {
	const list: PageTree.Item[] = [];

	for (const node of tree) {
		if (node.type === 'folder') {
			if (node.index) {
				list.push(node.index);
			}

			list.push(...scanNavigationList(node.children));
			continue;
		}

		if (node.type === 'page' && !node.external) {
			list.push(node);
		}
	}

	return list;
}

const listCache = new WeakMap<PageTree.Root, PageTree.Item[]>();

export function Footer({ items }: FooterProps) {
	const { root } = useTreeContext();
	const pathname = usePathname();

	const { previous, next } = useMemo(() => {
		if (items) {
			return items;
		}

		const cached = listCache.get(root);
		const list = cached ?? scanNavigationList(root.children);
		listCache.set(root, list);

		const idx = list.findIndex((item) => isActive(item.url, pathname, false));

		if (idx === -1) {
			return {};
		}
		return {
			previous: list[idx - 1],
			next: list[idx + 1],
		};
	}, [items, pathname, root]);

	return (
		<div
			className={cn(
				'@container grid gap-4 pb-6',
				previous && next ? 'grid-cols-2' : 'grid-cols-1'
			)}
		>
			{previous ? <FooterItem item={previous} index={0} /> : null}
			{next ? <FooterItem item={next} index={1} /> : null}
		</div>
	);
}

function FooterItem({ item, index }: { item: Item; index: 0 | 1 }) {
	const { text } = useI18n();
	const Icon = index === 0 ? ChevronLeft : ChevronRight;

	return (
		<Link
			href={item.url}
			className={cn(
				'@max-lg:col-span-full flex flex-col gap-2 rounded-lg border p-4 text-sm transition-colors hover:bg-fd-accent/80 hover:text-fd-accent-foreground',
				index === 1 && 'text-end'
			)}
		>
			<div
				className={cn(
					'inline-flex items-center gap-1.5 font-medium',
					index === 1 && 'flex-row-reverse'
				)}
			>
				<Icon className="-mx-1 size-4 shrink-0 rtl:rotate-180" />
				<p>{item.name}</p>
			</div>
			<p className="truncate text-fd-muted-foreground">
				{item.description ?? (index === 0 ? text.previousPage : text.nextPage)}
			</p>
		</Link>
	);
}

export type BreadcrumbProps = BreadcrumbOptions;

export function Breadcrumb(options: BreadcrumbProps) {
	const path = useTreePath();
	const { root } = useTreeContext();
	const items = useMemo(() => {
		return getBreadcrumbItemsFromPath(root, path, {
			includePage: options.includePage ?? false,
			...options,
		});
	}, [options, path, root]);

	if (items.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-row items-center gap-1.5 text-[15px] text-fd-muted-foreground">
			{items.map((item, i) => {
				const className = cn(
					'truncate',
					i === items.length - 1 && 'font-medium text-fd-primary'
				);

				return (
					<Fragment key={i}>
						{i !== 0 && <span className="text-fd-foreground/30">/</span>}
						{item.url ? (
							<Link
								href={item.url}
								className={cn(className, 'transition-opacity hover:opacity-80')}
							>
								{item.name}
							</Link>
						) : (
							<span className={className}>{item.name}</span>
						)}
					</Fragment>
				);
			})}
		</div>
	);
}
