'use client';
import { cva } from 'class-variance-authority';
import { usePathname } from 'fumadocs-core/framework';
import Link from 'fumadocs-core/link';
import type { PageTree } from 'fumadocs-core/server';
import * as SidebarPrimitive from 'fumadocs-core/sidebar';
import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { useSidebar } from 'fumadocs-ui/contexts/sidebar';
import { TreeContextProvider, useTreeContext } from 'fumadocs-ui/contexts/tree';
import { type ComponentProps, type ReactNode, useMemo } from 'react';
import { cn } from '../../lib/cn';

export interface DocsLayoutProps {
	tree: PageTree.Root;
	children: ReactNode;
}

export function DocsLayout({ tree, children }: DocsLayoutProps) {
	return (
		<TreeContextProvider tree={tree}>
			<header className="sticky top-0 z-20 h-14 bg-fd-background">
				<nav className="flex size-full flex-row items-center gap-2 px-4">
					<Link href="/" className="mr-auto font-medium">
						My Docs
					</Link>

					<SearchToggle />
					<NavbarSidebarTrigger className="md:hidden" />
				</nav>
			</header>
			<main
				id="nd-docs-layout"
				className="flex flex-1 flex-row [--fd-nav-height:56px]"
			>
				<Sidebar />
				{children}
			</main>
		</TreeContextProvider>
	);
}

function SearchToggle(props: ComponentProps<'button'>) {
	const { enabled, setOpenSearch } = useSearchContext();
	if (!enabled) {
		return;
	}

	return (
		<button
			{...props}
			className={cn('text-sm', props.className)}
			onClick={() => setOpenSearch(true)}
		>
			Search
		</button>
	);
}

function NavbarSidebarTrigger(props: ComponentProps<'button'>) {
	const { open, setOpen } = useSidebar();

	return (
		<button
			{...props}
			className={cn('text-sm', props.className)}
			onClick={() => setOpen(!open)}
		>
			Sidebar
		</button>
	);
}

function Sidebar() {
	const { root } = useTreeContext();
	const { open } = useSidebar();

	const children = useMemo(() => {
		function renderItems(items: PageTree.Node[]) {
			return items.map((item) => (
				<SidebarItem key={item.$id} item={item}>
					{item.type === 'folder' ? renderItems(item.children) : null}
				</SidebarItem>
			));
		}

		return renderItems(root.children);
	}, [root]);

	return (
		<SidebarPrimitive.SidebarList
			removeScrollOn="(width < 768px)" // md
			className={cn(
				'fixed top-14 z-20 flex shrink-0 flex-col overflow-auto p-4 text-sm md:sticky md:h-[calc(100dvh-56px)] md:w-[300px]',
				'max-md:inset-x-0 max-md:bottom-0 max-md:bg-fd-background',
				!open && 'max-md:invisible'
			)}
		>
			{children}
		</SidebarPrimitive.SidebarList>
	);
}

const linkVariants = cva(
	'flex w-full items-center gap-2 rounded-lg py-1.5 text-fd-foreground/80 [&_svg]:size-4',
	{
		variants: {
			active: {
				true: 'font-medium text-fd-primary',
				false: 'hover:text-fd-accent-foreground',
			},
		},
	}
);

function SidebarItem({
	item,
	children,
}: {
	item: PageTree.Node;
	children: ReactNode;
}) {
	const pathname = usePathname();

	if (item.type === 'page') {
		return (
			<Link
				href={item.url}
				className={linkVariants({
					active: pathname === item.url,
				})}
			>
				{item.icon}
				{item.name}
			</Link>
		);
	}

	if (item.type === 'separator') {
		return (
			<p className="mt-6 mb-2 text-fd-muted-foreground first:mt-0">
				{item.icon}
				{item.name}
			</p>
		);
	}

	return (
		<div>
			{item.index ? (
				<Link
					className={linkVariants({
						active: pathname === item.index.url,
					})}
					href={item.index.url}
				>
					{item.index.icon}
					{item.index.name}
				</Link>
			) : (
				<p className={cn(linkVariants(), 'text-start')}>
					{item.icon}
					{item.name}
				</p>
			)}
			<div className="flex flex-col border-l pl-4">{children}</div>
		</div>
	);
}
