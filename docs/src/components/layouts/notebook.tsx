'use client';

import Link from 'fumadocs-core/link';
import type { PageTree } from 'fumadocs-core/server';
import {
	NavProvider,
	type PageStyles,
	StylesProvider,
} from 'fumadocs-ui/contexts/layout';
import { ChevronDown, Languages, SidebarIcon } from 'lucide-react';
import { Fragment, type HTMLAttributes, useId, useMemo } from 'react';
import { cn } from '../../lib/cn';
import { FrameworkTreeProvider } from '../layout/framework-tree-provider';
import { LanguageToggle } from '../layout/language-toggle';
import { type Option, RootToggle } from '../layout/root-toggle';
import { LargeSearchToggle, SearchToggle } from '../layout/search-toggle';
import {
	CollapsibleSidebar,
	Sidebar,
	SidebarCollapseTrigger,
	SidebarFooter,
	SidebarHeader,
	SidebarPageTree,
	SidebarViewport,
} from '../layout/sidebar';
import { buttonVariants } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
	getSidebarTabsFromOptions,
	layoutVariables,
	SidebarLinkItem,
	type SidebarOptions,
} from './docs/shared';
import { BaseLinkItem, type LinkItemType } from './links';
import {
	LayoutTab,
	LayoutTabs,
	Navbar,
	NavbarSidebarTrigger,
	SidebarLayoutTab,
} from './notebook-client';

export { Navbar, NavbarSidebarTrigger } from './notebook-client';

import { usePathname } from 'next/navigation';
import { type BaseLayoutProps, getLinks } from './shared';

export interface DocsLayoutProps extends BaseLayoutProps {
	tree: PageTree.Root;
	tabMode?: 'sidebar' | 'navbar';

	nav?: BaseLayoutProps['nav'] & {
		mode?: 'top' | 'auto';
	};

	sidebar?: Omit<Partial<SidebarOptions>, 'component' | 'enabled'>;

	containerProps?: HTMLAttributes<HTMLDivElement>;
}

function createVariablesClassName(tabs: Option[], tabMode: string) {
	return cn(
		'[--fd-nav-height:calc(var(--spacing)*14)] [--fd-tocnav-height:36px] md:[--fd-sidebar-width:286px] xl:[--fd-toc-width:286px] xl:[--fd-tocnav-height:0px]',
		tabs.length > 0 &&
			tabMode === 'navbar' &&
			'lg:[--fd-nav-height:calc(var(--spacing)*24)]'
	);
}

function createPageStyles(): PageStyles {
	return {
		tocNav: cn('xl:hidden'),
		toc: cn('max-xl:hidden'),
		page: cn('mt-(--fd-nav-height)'),
	};
}

export function DocsLayout({
	tabMode = 'sidebar',
	nav: { transparentMode, ...nav } = {},
	sidebar: {
		collapsible: sidebarCollapsible = true,
		tabs: tabOptions,
		banner: sidebarBanner,
		footer: sidebarFooter,
		components: sidebarComponents,
		...sidebar
	} = {},
	i18n = false,
	themeSwitch,
	...props
}: DocsLayoutProps) {
	const navMode = nav.mode ?? 'auto';
	const links = getLinks(props.links ?? [], props.githubUrl);
	const pathname = usePathname();

	// Get tabs and ensure they're always displayed, even on root
	const tabs = useMemo(() => {
		const allTabs = getSidebarTabsFromOptions(tabOptions, props.tree) ?? [];

		// Map framework names to iconKeys
		const enhancedTabs = allTabs.map((tab) => {
			if (typeof tab.title === 'string') {
				const title = tab.title.toLowerCase();
				let iconKey: string | undefined;

				if (title === 'nextjs' || title === 'next.js') {
					iconKey = 'next';
				} else if (title === 'react') {
					iconKey = 'react';
				} else if (title === 'javascript') {
					iconKey = 'js';
				} else if (title === 'hono') {
					iconKey = 'hono';
				}

				if (iconKey) {
					return { ...tab, iconKey };
				}
			}
			return tab;
		});

		// Only show framework tabs (those with root:true) when we're on a framework route or root
		if (pathname === '/docs' || pathname === '/docs/') {
			// On root path, only show framework-specific tabs
			return enhancedTabs.filter((tab) => {
				// Find the corresponding folder in the tree
				const folder = props.tree.children.find(
					(item) =>
						item.type === 'folder' &&
						item.root === true &&
						typeof item.name === 'string' &&
						item.name.toLowerCase() === tab.title?.toString().toLowerCase()
				);

				// Only include tabs that correspond to framework folders (root:true)
				return !!folder;
			});
		}

		return enhancedTabs;
	}, [tabOptions, props.tree, pathname]);

	// Force show tabs even on root page
	const shouldShowTabs = tabs.length > 0;

	// Check if we're on the root page (no framework in URL)
	const isRootPage = !pathname.split('/')[2];

	// Find the NextJS tab to highlight when on root
	const nextJsTab = useMemo(() => {
		if (!shouldShowTabs) {
			return null;
		}

		return tabs.find((tab) => {
			// Check if title is a string and matches "NextJS" case-insensitively
			if (typeof tab.title === 'string') {
				return tab.title.toLowerCase() === 'nextjs';
			}
			return false;
		});
	}, [tabs, shouldShowTabs]);

	// This context will be passed to FrameworkTreeProvider
	const defaultFramework = isRootPage && nextJsTab ? 'nextjs' : '';

	const Aside = sidebarCollapsible ? CollapsibleSidebar : Sidebar;

	const variables = createVariablesClassName(tabs, tabMode);
	const pageStyles = createPageStyles();

	return (
		<FrameworkTreeProvider
			tree={props.tree}
			defaultFramework={defaultFramework}
		>
			<NavProvider transparentMode={transparentMode}>
				<main
					id={useId()}
					{...props.containerProps}
					className={cn(
						'flex w-full flex-1 flex-row pe-(--fd-layout-offset)',
						variables,
						props.containerProps?.className
					)}
					style={{
						...layoutVariables,
						...props.containerProps?.style,
					}}
				>
					<Aside
						{...sidebar}
						className={cn(
							'md:ps-(--fd-layout-offset)',
							navMode === 'top' ? 'bg-transparent' : 'md:[--fd-nav-height:0px]',
							sidebar.className
						)}
						inner={{
							className: cn(
								navMode === 'top' ? 'md:pt-2.5' : 'md:pt-3.5',
								tabMode === 'navbar' && 'md:pt-0'
							),
						}}
					>
						<SidebarHeader>
							{navMode === 'auto' && (
								<div className="flex flex-row justify-between max-md:hidden">
									<Link
										href={nav.url ?? '/'}
										className="inline-flex items-center gap-2.5 font-medium"
									>
										{nav.title}
									</Link>
									<SidebarCollapseTrigger
										className={cn(
											buttonVariants({
												color: 'ghost',
												size: 'icon-sm',
											}),
											'mb-auto text-fd-muted-foreground'
										)}
									>
										<SidebarIcon />
									</SidebarCollapseTrigger>
								</div>
							)}
							{nav.children}
							{sidebarBanner}
							{tabMode === 'sidebar' && shouldShowTabs ? (
								<RootToggle
									options={tabs}
									className="-mx-2"
									defaultSelected={
										isRootPage && nextJsTab ? nextJsTab : undefined
									}
								/>
							) : null}
						</SidebarHeader>
						<SidebarViewport>
							{tabMode === 'navbar' &&
								tabs.map((tab, i) => (
									<SidebarLayoutTab
										key={tab.url}
										item={tab}
										className={cn('lg:hidden', i === tabs.length - 1 && 'mb-4')}
										forceActive={nextJsTab === tab && isRootPage}
									/>
								))}
							{links.map((item, i) => (
								<SidebarLinkItem
									key={i}
									item={item}
									className={cn('lg:hidden', i === links.length - 1 && 'mb-4')}
								/>
							))}

							<SidebarPageTree components={sidebarComponents} />
						</SidebarViewport>
						<SidebarFooter
							className={cn(
								'flex flex-row items-center',
								!sidebarFooter && 'md:hidden'
							)}
						>
							{i18n ? (
								<LanguageToggle className="me-auto md:hidden">
									<Languages className="size-5 text-fd-muted-foreground" />
								</LanguageToggle>
							) : null}
							{/* {replaceOrDefault(
								themeSwitch,
								<ThemeToggle
									className="md:hidden"
									mode={themeSwitch?.mode ?? 'light-dark-system'}
								/>
							)} */}
							{sidebarFooter}
						</SidebarFooter>
					</Aside>
					<DocsNavbar
						nav={nav}
						links={links}
						i18n={i18n}
						sidebarCollapsible={sidebarCollapsible}
						tabs={tabMode === 'navbar' ? tabs : []}
						defaultSelected={
							isRootPage && nextJsTab && tabMode === 'navbar'
								? nextJsTab
								: undefined
						}
					/>
					<StylesProvider {...pageStyles}>{props.children}</StylesProvider>
				</main>
			</NavProvider>
		</FrameworkTreeProvider>
	);
}

function DocsNavbar({
	sidebarCollapsible,
	links,
	nav = {},
	i18n,
	tabs,
	defaultSelected,
}: {
	nav: DocsLayoutProps['nav'];
	sidebarCollapsible: boolean;
	i18n: Required<DocsLayoutProps>['i18n'];
	themeSwitch?: DocsLayoutProps['themeSwitch'];
	links: LinkItemType[];
	tabs: Option[];
	defaultSelected?: Option;
}) {
	const navMode = nav.mode ?? 'auto';
	const pathname = usePathname();

	return (
		<Navbar mode={navMode}>
			<div
				className={cn(
					'flex h-14 flex-row border-fd-foreground/10 border-b px-4',
					navMode === 'auto' && 'md:px-6'
				)}
			>
				<div
					className={cn(
						'flex flex-row items-center',
						navMode === 'top' && 'flex-1 pe-4'
					)}
				>
					{sidebarCollapsible && navMode === 'auto' ? (
						<SidebarCollapseTrigger
							className={cn(
								buttonVariants({
									color: 'ghost',
									size: 'icon-sm',
								}),
								'-ms-1.5 me-2 text-fd-muted-foreground data-[collapsed=false]:hidden max-md:hidden'
							)}
						>
							<SidebarIcon />
						</SidebarCollapseTrigger>
					) : null}
					<Link
						href={nav.url ?? '/'}
						className={cn(
							'inline-flex items-center gap-2.5 font-semibold',
							navMode === 'auto' && 'md:hidden'
						)}
					>
						{nav.title}
					</Link>
				</div>

				<LargeSearchToggle
					hideIfDisabled
					className={cn(
						'my-auto w-full rounded-xl max-md:hidden',
						navMode === 'top' ? 'max-w-sm px-2' : 'max-w-[240px]'
					)}
				/>

				<div className="flex flex-1 flex-row items-center justify-end">
					<div className="flex flex-row items-center gap-6 px-4 empty:hidden max-lg:hidden">
						{links
							.filter((item) => item.type !== 'icon')
							.map((item, i) => (
								<NavbarLinkItem
									key={i}
									item={item}
									className="text-fd-muted-foreground text-sm transition-colors hover:text-fd-accent-foreground"
								/>
							))}
					</div>
					{nav.children}
					<SearchToggle hideIfDisabled className="md:hidden" />
					<NavbarSidebarTrigger className="md:hidden" />
					{links
						.filter((item) => item.type === 'icon')
						.map((item, i) => (
							<BaseLinkItem
								key={i}
								item={item}
								className={cn(
									buttonVariants({ size: 'icon-sm', color: 'ghost' }),
									'text-fd-muted-foreground max-lg:hidden'
								)}
								aria-label={item.label}
							>
								{item.icon}
							</BaseLinkItem>
						))}
					{i18n ? (
						<LanguageToggle className="max-md:hidden">
							<Languages className="size-4.5 text-fd-muted-foreground" />
						</LanguageToggle>
					) : null}
					{/* {replaceOrDefault(
						themeSwitch,
						<ThemeToggle
							className="ms-2 max-md:hidden"
							mode={themeSwitch?.mode ?? 'light-dark-system'}
						/>
					)} */}
					{sidebarCollapsible && navMode === 'top' ? (
						<SidebarCollapseTrigger
							className={cn(
								buttonVariants({
									color: 'secondary',
									size: 'icon-sm',
								}),
								'ms-2 rounded-full text-fd-muted-foreground max-md:hidden'
							)}
						>
							<SidebarIcon />
						</SidebarCollapseTrigger>
					) : null}
				</div>
			</div>
			{tabs.length > 0 ? (
				<LayoutTabs className="h-10 border-fd-foreground/10 border-b px-6 max-lg:hidden">
					{tabs.map((tab) => (
						<LayoutTab
							key={tab.url}
							{...tab}
							forceActive={defaultSelected === tab && pathname === '/docs'}
						/>
					))}
				</LayoutTabs>
			) : null}
		</Navbar>
	);
}

function NavbarLinkItem({
	item,
	...props
}: { item: LinkItemType } & HTMLAttributes<HTMLElement>) {
	if (item.type === 'menu') {
		return (
			<Popover>
				<PopoverTrigger
					{...props}
					className={cn('inline-flex items-center gap-1.5', props.className)}
				>
					{item.text}
					<ChevronDown className="size-3" />
				</PopoverTrigger>
				<PopoverContent className="flex flex-col">
					{item.items.map((child, i) => {
						if (child.type === 'custom') {
							return <Fragment key={i}>{child.children}</Fragment>;
						}

						return (
							<BaseLinkItem
								key={i}
								item={child}
								className="inline-flex items-center gap-2 rounded-md p-2 text-start hover:bg-fd-accent hover:text-fd-accent-foreground data-[active=true]:text-fd-primary [&_svg]:size-4"
							>
								{child.icon}
								{child.text}
							</BaseLinkItem>
						);
					})}
				</PopoverContent>
			</Popover>
		);
	}

	if (item.type === 'custom') {
		return item.children;
	}

	return (
		<BaseLinkItem item={item} {...props}>
			{item.text}
		</BaseLinkItem>
	);
}
