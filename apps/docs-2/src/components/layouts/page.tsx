'use client';
import { Link, usePathname } from 'fumadocs-core/framework';
import type {
	PageTree,
	TOCItemType,
	TableOfContents,
} from 'fumadocs-core/server';
import { AnchorProvider, useActiveAnchors } from 'fumadocs-core/toc';
import { useTreeContext } from 'fumadocs-ui/contexts/tree';
import { type ComponentProps, type ReactNode, useMemo } from 'react';
import { cn } from '../../lib/cn';

export interface DocsPageProps {
	toc?: TableOfContents;

	children: ReactNode;
}

export function DocsPage({ toc = [], ...props }: DocsPageProps) {
	return (
		<AnchorProvider toc={toc}>
			<main className="flex w-full min-w-0 flex-col">
				<article className="flex w-full max-w-[860px] flex-1 flex-col gap-6 px-4 py-8 md:mx-auto md:px-6">
					{props.children}
					<Footer />
				</article>
			</main>
			{toc.length > 0 && (
				<div className="sticky top-(--fd-nav-height) h-[calc(100dvh-var(--fd-nav-height))] w-[286px] shrink-0 overflow-auto p-4 max-xl:hidden">
					<p className="mb-2 text-fd-muted-foreground text-sm">On this page</p>
					<div className="flex flex-col">
						{toc.map((item) => (
							<TocItem key={item.url} item={item} />
						))}
					</div>
				</div>
			)}
		</AnchorProvider>
	);
}

export function DocsBody(props: ComponentProps<'div'>) {
	return (
		<div {...props} className={cn('prose', props.className)}>
			{props.children}
		</div>
	);
}

export function DocsDescription(props: ComponentProps<'p'>) {
	// don't render if no description provided
	if (props.children === undefined) return null;

	return (
		<p
			{...props}
			className={cn('mb-8 text-fd-muted-foreground text-lg', props.className)}
		>
			{props.children}
		</p>
	);
}

export function DocsTitle(props: ComponentProps<'h1'>) {
	return (
		<h1 {...props} className={cn('font-semibold text-3xl', props.className)}>
			{props.children}
		</h1>
	);
}

function TocItem({ item }: { item: TOCItemType }) {
	const isActive = useActiveAnchors().includes(item.url.slice(1));

	return (
		<a
			href={item.url}
			className={cn(
				'py-1 text-fd-foreground/80 text-sm',
				isActive && 'text-fd-primary'
			)}
			style={{
				paddingLeft: Math.max(0, item.depth - 2) * 16,
			}}
		>
			{item.title}
		</a>
	);
}

function Footer() {
	const { root } = useTreeContext();
	const pathname = usePathname();
	const flatten = useMemo(() => {
		const result: PageTree.Item[] = [];

		function scan(items: PageTree.Node[]) {
			for (const item of items) {
				if (item.type === 'page') result.push(item);
				else if (item.type === 'folder') {
					if (item.index) result.push(item.index);
					scan(item.children);
				}
			}
		}

		scan(root.children);
		return result;
	}, [root]);

	const { previous, next } = useMemo(() => {
		const idx = flatten.findIndex((item) => item.url === pathname);

		if (idx === -1) return {};
		return {
			previous: flatten[idx - 1],
			next: flatten[idx + 1],
		};
	}, [flatten, pathname]);

	return (
		<div className="flex flex-row items-center justify-between gap-2 font-medium">
			{previous ? <Link href={previous.url}>{previous.name}</Link> : null}
			{next ? <Link href={next.url}>{next.name}</Link> : null}
		</div>
	);
}
