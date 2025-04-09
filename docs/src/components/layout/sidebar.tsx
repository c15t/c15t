'use client';
import type {
	CollapsibleContentProps,
	CollapsibleTriggerProps,
} from '@radix-ui/react-collapsible';
import type { ScrollAreaProps } from '@radix-ui/react-scroll-area';
import { cva } from 'class-variance-authority';
import { usePathname } from 'fumadocs-core/framework';
import Link, { type LinkProps } from 'fumadocs-core/link';
import type { PageTree } from 'fumadocs-core/server';
import * as Base from 'fumadocs-core/sidebar';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { useSidebar } from 'fumadocs-ui/contexts/sidebar';
import { useTreeContext, useTreePath } from 'fumadocs-ui/contexts/tree';
import { ChevronDown, ExternalLink } from 'lucide-react';
import {
	type ButtonHTMLAttributes,
	type FC,
	Fragment,
	type HTMLAttributes,
	type ReactNode,
	createContext,
	createElement,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { cn } from '../../lib/cn';
import { isActive } from '../../lib/is-active';
import {
	determineActiveFramework,
	frameworkOptions,
	javascriptNavigation,
	nextjsNavigation,
	reactNavigation,
} from '../general-sidebar';
import { iconMap } from '../icons';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '../ui/collapsible';
import { ScrollArea, ScrollViewport } from '../ui/scroll-area';
import { RootToggle } from './root-toggle';
import { SkeletonFrameworkSelector, SkeletonNavigation } from './skeleton';

// Create a context to track the expanded state of folders across navigation
const PersistentNavContext = createContext<{
	expandedFolders: Set<string>;
	toggleFolder: (id: string) => void;
}>({
	expandedFolders: new Set(),
	toggleFolder: () => {},
});

// Provider component for the persistent navigation state
export function PersistentNavProvider({ children }: { children: ReactNode }) {
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
		new Set()
	);

	const toggleFolder = (id: string) => {
		setExpandedFolders((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(id)) {
				newSet.delete(id);
			} else {
				newSet.add(id);
			}
			return newSet;
		});
	};

	const value = useMemo(
		() => ({ expandedFolders, toggleFolder }),
		[expandedFolders]
	);

	return (
		<PersistentNavContext.Provider value={value}>
			{children}
		</PersistentNavContext.Provider>
	);
}

// Hook to use the persistent navigation state
export function usePersistentNav() {
	return useContext(PersistentNavContext);
}

// Create a context to track the active framework
const FrameworkContext = createContext<{
	activeFramework: 'nextjs' | 'react' | 'javascript';
	setActiveFramework: (framework: 'nextjs' | 'react' | 'javascript') => void;
}>({
	activeFramework: 'nextjs',
	setActiveFramework: () => {},
});

// Provider for the framework context
export function FrameworkProvider({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	// Always use 'react' as the initial default on both server and client
	// This ensures consistent rendering and prevents hydration mismatches
	const [activeFramework, setActiveFramework] = useState<
		'nextjs' | 'react' | 'javascript'
	>('react');

	// Flag to track if we're hydrated on the client
	const [isHydrated, setIsHydrated] = useState(false);

	// Set hydrated flag after component mounts (client-side only)
	useEffect(() => {
		setIsHydrated(true);
		// After hydration, we can safely update the framework based on pathname
		const framework = determineActiveFramework(pathname);
		setActiveFramework(framework as 'nextjs' | 'react' | 'javascript');
	}, [pathname]);

	// Update active framework when pathname changes for non-general pages
	// Only run this effect after first hydration completed
	useEffect(() => {
		if (!isHydrated) return;

		// Only update the active framework if we're not on a general page
		// For general pages, we want to keep the current framework
		if (!pathname.includes('/general')) {
			const framework = determineActiveFramework(pathname);
			setActiveFramework(framework as 'nextjs' | 'react' | 'javascript');
		}
	}, [pathname, isHydrated]);

	// Provide a way to manually change framework and persist the choice
	const setAndPersistFramework = useCallback(
		(framework: 'nextjs' | 'react' | 'javascript') => {
			setActiveFramework(framework);
			if (typeof window !== 'undefined') {
				try {
					localStorage.setItem('activeFramework', framework);
				} catch (e) {
					// Ignore localStorage errors (private browsing, etc.)
				}
			}
		},
		[]
	);

	const value = useMemo(
		() => ({ activeFramework, setActiveFramework: setAndPersistFramework }),
		[activeFramework, setAndPersistFramework]
	);

	return (
		<FrameworkContext.Provider value={value}>
			{children}
		</FrameworkContext.Provider>
	);
}

// Hook to use the framework context
export function useFramework() {
	return useContext(FrameworkContext);
}

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
	/**
	 * Open folders by default if their level is lower or equal to a specific level
	 * (Starting from 1)
	 *
	 * @defaultValue 0
	 */
	defaultOpenLevel?: number;

	/**
	 * Prefetch links
	 *
	 * @defaultValue true
	 */
	prefetch?: boolean;
}

interface InternalContext {
	defaultOpenLevel: number;
	prefetch: boolean;
	level: number;
}

const itemVariants = cva(
	'relative flex flex-row items-center gap-2 rounded-md p-2 text-start text-fd-muted-foreground [overflow-wrap:anywhere] md:py-1.5 [&_svg]:size-4 [&_svg]:shrink-0',
	{
		variants: {
			active: {
				true: 'bg-fd-primary/10 text-fd-primary',
				false:
					'transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none',
			},
		},
	}
);

const Context = createContext<InternalContext | null>(null);
const FolderContext = createContext<{
	open: boolean;
	setOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
} | null>(null);

export function CollapsibleSidebar(props: SidebarProps) {
	const { collapsed } = useSidebar();
	const [hover, setHover] = useState(false);
	const timerRef = useRef(0);
	const closeTimeRef = useRef(0);

	useOnChange(collapsed, () => {
		setHover(false);
		closeTimeRef.current = Date.now() + 150;
	});

	return (
		<Sidebar
			{...props}
			onPointerEnter={(e) => {
				if (
					!collapsed ||
					e.pointerType === 'touch' ||
					closeTimeRef.current > Date.now()
				)
					return;
				window.clearTimeout(timerRef.current);
				setHover(true);
			}}
			onPointerLeave={(e) => {
				if (!collapsed || e.pointerType === 'touch') return;
				window.clearTimeout(timerRef.current);

				timerRef.current = window.setTimeout(
					() => {
						setHover(false);
						closeTimeRef.current = Date.now() + 150;
					},
					Math.min(e.clientX, document.body.clientWidth - e.clientX) > 100
						? 0
						: 500
				);
			}}
			data-collapsed={collapsed}
			className={cn(
				'md:transition-all',
				collapsed &&
					'md:-me-(--fd-sidebar-width) md:-translate-x-(--fd-sidebar-offset) rtl:md:translate-x-(--fd-sidebar-offset)',
				collapsed && hover && 'z-50 md:translate-x-0',
				collapsed && !hover && 'md:opacity-0',
				props.className
			)}
			style={
				{
					'--fd-sidebar-offset': 'calc(var(--fd-sidebar-width) - 6px)',
					...props.style,
				} as object
			}
		/>
	);
}

export function Sidebar({
	defaultOpenLevel = 0,
	prefetch = true,
	inner,
	...props
}: SidebarProps & { inner?: HTMLAttributes<HTMLDivElement> }) {
	const context = useMemo<InternalContext>(() => {
		return {
			defaultOpenLevel,
			prefetch,
			level: 1,
		};
	}, [defaultOpenLevel, prefetch]);

	return (
		<Context.Provider value={context}>
			<Base.SidebarList
				id="nd-sidebar"
				removeScrollOn="(width < 768px)" // md
				{...props}
				className={cn(
					'fixed top-[calc(var(--fd-banner-height)+var(--fd-nav-height))] z-10 bg-fd-card text-sm md:sticky md:h-(--fd-sidebar-height)',
					'max-md:inset-x-0 max-md:bottom-0 max-md:bg-fd-background/80 max-md:text-[15px] max-md:backdrop-blur-lg max-md:data-[open=false]:invisible',
					props.className
				)}
				style={
					{
						...props.style,
						'--fd-sidebar-height':
							'calc(100dvh - var(--fd-banner-height) - var(--fd-nav-height))',
					} as object
				}
			>
				<div
					{...inner}
					className={cn(
						'flex size-full max-w-full flex-col pt-2 md:ms-auto md:w-(--fd-sidebar-width) md:pt-4',
						inner?.className
					)}
				>
					{props.children}
				</div>
			</Base.SidebarList>
		</Context.Provider>
	);
}

export function SidebarHeader(props: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			{...props}
			className={cn('flex flex-col gap-2 px-4 empty:hidden', props.className)}
		>
			{props.children}
		</div>
	);
}

export function SidebarFooter(props: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			{...props}
			className={cn(
				'flex flex-col border-t px-4 py-3 empty:hidden',
				props.className
			)}
		>
			{props.children}
		</div>
	);
}

export function SidebarViewport(props: ScrollAreaProps) {
	return (
		<ScrollArea {...props} className={cn('h-full', props.className)}>
			<ScrollViewport
				className="p-4"
				style={{
					maskImage: 'linear-gradient(to bottom, transparent, white 12px)',
				}}
			>
				{props.children}
			</ScrollViewport>
		</ScrollArea>
	);
}

export function SidebarSeparator(props: HTMLAttributes<HTMLParagraphElement>) {
	const { level } = useInternalContext();

	return (
		<p
			{...props}
			className={cn(
				'mb-2 inline-flex items-center gap-2 px-2 font-medium text-sm [&_svg]:size-4 [&_svg]:shrink-0',
				props.className
			)}
			style={{
				paddingInlineStart: getOffset(level),
				...props.style,
			}}
		>
			{props.children}
		</p>
	);
}

export function SidebarItem({
	icon,
	...props
}: LinkProps & {
	icon?: ReactNode;
}) {
	const pathname = usePathname();
	const active =
		props.href !== undefined && isActive(props.href, pathname, false);
	const { prefetch, level } = useInternalContext();

	return (
		<Link
			{...props}
			data-active={active}
			className={cn(itemVariants({ active }), props.className)}
			prefetch={prefetch}
			style={{
				paddingInlineStart: getOffset(level),
				...props.style,
			}}
		>
			<Border level={level} active={active} />
			{icon ?? (props.external ? <ExternalLink /> : null)}
			{props.children}
		</Link>
	);
}

export function SidebarFolder({
	defaultOpen = false,
	onOpenChange,
	...props
}: HTMLAttributes<HTMLDivElement> & {
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const [open, setOpen] = useState(defaultOpen);

	useOnChange(defaultOpen, (v) => {
		if (v) setOpen(v);
	});

	// Handle open state changes and notify parent components
	const handleOpenChange = (newOpenState: boolean) => {
		setOpen(newOpenState);
		if (onOpenChange) {
			onOpenChange(newOpenState);
		}
	};

	return (
		<Collapsible open={open} onOpenChange={handleOpenChange} {...props}>
			<FolderContext.Provider
				value={useMemo(
					() => ({
						open,
						setOpen: (value) => {
							if (typeof value === 'function') {
								const newValue = value(open);
								handleOpenChange(newValue);
							} else {
								handleOpenChange(value);
							}
						},
					}),
					[open, handleOpenChange]
				)}
			>
				{props.children}
			</FolderContext.Provider>
		</Collapsible>
	);
}

export function SidebarFolderTrigger(props: CollapsibleTriggerProps) {
	const { level } = useInternalContext();
	const { open } = useFolderContext();

	return (
		<CollapsibleTrigger
			{...props}
			className={cn(itemVariants({ active: false }), 'w-full')}
			style={{
				paddingInlineStart: getOffset(level),
				...props.style,
			}}
		>
			<Border level={level} />
			{props.children}
			<ChevronDown
				data-icon
				className={cn('ms-auto transition-transform', !open && '-rotate-90')}
			/>
		</CollapsibleTrigger>
	);
}

export function SidebarFolderLink(props: LinkProps) {
	const { open, setOpen } = useFolderContext();
	const { prefetch, level } = useInternalContext();

	const pathname = usePathname();
	const active =
		props.href !== undefined && isActive(props.href, pathname, false);

	return (
		<Link
			{...props}
			data-active={active}
			className={cn(itemVariants({ active }), 'w-full', props.className)}
			onClick={(e) => {
				if ((e.target as HTMLElement).hasAttribute('data-icon')) {
					setOpen((prev) => !prev);
					e.preventDefault();
				} else {
					setOpen((prev) => !active || !prev);
				}
			}}
			prefetch={prefetch}
			style={{
				paddingInlineStart: getOffset(level),
				...props.style,
			}}
		>
			<Border level={level} active={active} />
			{props.children}
			<ChevronDown
				data-icon
				className={cn('ms-auto transition-transform', !open && '-rotate-90')}
			/>
		</Link>
	);
}

export function SidebarFolderContent(props: CollapsibleContentProps) {
	const ctx = useInternalContext();

	return (
		<CollapsibleContent {...props} className={cn('relative', props.className)}>
			<Context.Provider
				value={useMemo(
					() => ({
						...ctx,
						level: ctx.level + 1,
					}),
					[ctx]
				)}
			>
				<div className="absolute inset-y-0 start-3 w-px bg-fd-border" />
				{props.children}
			</Context.Provider>
		</CollapsibleContent>
	);
}

export function SidebarCollapseTrigger(
	props: ButtonHTMLAttributes<HTMLButtonElement>
) {
	const { collapsed, setCollapsed } = useSidebar();

	return (
		<button
			type="button"
			aria-label="Collapse Sidebar"
			data-collapsed={collapsed}
			{...props}
			onClick={() => {
				setCollapsed((prev) => !prev);
			}}
		>
			{props.children}
		</button>
	);
}

function useFolderContext() {
	const ctx = useContext(FolderContext);

	if (!ctx) throw new Error('Missing sidebar folder');
	return ctx;
}

function useInternalContext(): InternalContext {
	const ctx = useContext(Context);
	if (!ctx) throw new Error('<Sidebar /> component required.');

	return ctx;
}

export interface SidebarComponents {
	Item: FC<{ item: PageTree.Item }>;
	Folder: FC<{ item: PageTree.Folder; level: number; children: ReactNode }>;
	Separator: FC<{ item: PageTree.Separator }>;
}

/**
 * Render sidebar items from page tree
 */
export function SidebarPageTree(props: {
	components?: Partial<SidebarComponents>;
	useCustomNavigation?: boolean;
}) {
	const treeContext = useTreeContext();
	const { activeFramework } = useFramework();

	// Get the appropriate navigation tree based on the active framework
	const getNavigationTree = () => {
		if (activeFramework === 'react') {
			return reactNavigation;
		}
		if (activeFramework === 'javascript') {
			return javascriptNavigation;
		}
		return nextjsNavigation;
	};

	// Use either the custom navigation or the context from TreeProvider
	const root =
		props.useCustomNavigation !== false
			? getNavigationTree()
			: treeContext.root;

	return useMemo(() => {
		const { Separator, Item, Folder } = props.components ?? {};

		function renderSidebarList(
			items: PageTree.Node[],
			level: number
		): ReactNode[] {
			// We no longer need to append generalSidebar items as they're integrated
			const itemsToRender = items;

			return itemsToRender.map((item, i) => {
				if (item.type === 'separator') {
					if (Separator) return <Separator key={i} item={item} />;
					return (
						<SidebarSeparator key={i} className={cn(i !== 0 && 'mt-8')}>
							{item.icon}
							{item.name}
						</SidebarSeparator>
					);
				}

				if (item.type === 'folder') {
					const children = renderSidebarList(item.children, level + 1);

					if (Folder)
						return (
							<Folder key={i} item={item} level={level}>
								{children}
							</Folder>
						);
					return (
						<PageTreeFolder key={i} item={item}>
							{children}
						</PageTreeFolder>
					);
				}

				if (Item) return <Item key={item.url} item={item} />;
				return (
					<SidebarItem
						key={item.url}
						href={item.url}
						external={item.external}
						icon={item.icon}
					>
						{item.name}
					</SidebarItem>
				);
			});
		}

		return (
			<Fragment key={`${root.$id}-${activeFramework}`}>
				{renderSidebarList(root.children, 1)}
			</Fragment>
		);
	}, [props.components, root, props.useCustomNavigation, activeFramework]);
}

/**
 * Wrapper for SidebarPageTree that provides persistent navigation state and framework context
 */
export function PersistentSidebarPageTree(props: {
	components?: Partial<SidebarComponents>;
	useCustomNavigation?: boolean;
}) {
	return (
		<FrameworkProvider>
			<PersistentNavProvider>
				<SidebarContent
					useCustomNavigation={props.useCustomNavigation !== false}
					components={props.components}
				/>
			</PersistentNavProvider>
		</FrameworkProvider>
	);
}

/**
 * SidebarContent component that handles hydration and displays skeletal UI when needed
 */
function SidebarContent({
	useCustomNavigation,
	components,
}: {
	useCustomNavigation: boolean;
	components?: Partial<SidebarComponents>;
}) {
	const [isHydrated, setIsHydrated] = useState(false);

	// Set hydrated flag after component mounts
	useEffect(() => {
		setIsHydrated(true);
	}, []);

	// If not hydrated yet, show a skeleton UI with "React" framework selected
	if (!isHydrated) {
		return (
			<>
				<SkeletonFrameworkSelector />
				<SkeletonNavigation />
			</>
		);
	}

	return (
		<>
			<FrameworkSelector />
			<SidebarPageTree
				useCustomNavigation={useCustomNavigation}
				components={components}
			/>
		</>
	);
}

/**
 * Framework selector dropdown for the sidebar
 */
export function FrameworkSelector(props: HTMLAttributes<HTMLDivElement>) {
	const { activeFramework, setActiveFramework } = useFramework();

	// Create options with active state based on current framework
	const options = useMemo(() => {
		return frameworkOptions.map((option) => ({
			...option,
			icon: option.icon
				? createElement(iconMap[option.icon as keyof typeof iconMap], {
						className: 'w-6 h-6',
					})
				: null,
			active:
				(option.title === 'React' && activeFramework === 'react') ||
				(option.title === 'Next.js' && activeFramework === 'nextjs') ||
				(option.title === 'Javascript' && activeFramework === 'javascript'),
		}));
	}, [activeFramework]);

	// Custom click handler to ensure we can keep state when clicking
	const handleOptionClick = (framework: string) => {
		if (framework === 'React') {
			setActiveFramework('react');
		} else if (framework === 'Javascript') {
			setActiveFramework('javascript');
		} else {
			setActiveFramework('nextjs');
		}
	};

	return (
		<div {...props} className={cn('mb-3', props.className)}>
			<div className="pb-1 pl-2 text-fd-muted-foreground text-xs">
				Select framework documentation
			</div>
			<RootToggle
				options={options}
				className="w-full justify-between"
				onOptionClick={handleOptionClick}
			/>
		</div>
	);
}

function PageTreeFolder({
	item,
	...props
}: HTMLAttributes<HTMLElement> & {
	item: PageTree.Folder;
}) {
	const { defaultOpenLevel, level } = useInternalContext();
	const path = useTreePath();
	const { expandedFolders, toggleFolder } = usePersistentNav();
	const pathname = usePathname();

	// Use the folder's ID to track its expanded state
	const folderId = item.$id || `folder-${item.name}`;
	const isExpanded = expandedFolders.has(folderId);

	// Check if this folder should be active based on the current path
	const currentFramework = determineActiveFramework(pathname);
	const isActiveFramework = folderId.startsWith(currentFramework);

	// Determine if the folder should be open by default
	const shouldDefaultOpen =
		(item.defaultOpen ?? defaultOpenLevel >= level) ||
		path.includes(item) ||
		// Also open if this is the active framework and we're on a general page
		(isActiveFramework && pathname.includes('/general'));

	// Initialize the folder's state if it's not already tracked
	useEffect(() => {
		if (shouldDefaultOpen && !expandedFolders.has(folderId)) {
			toggleFolder(folderId);
		}
		// Only run once on mount
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Also update when pathname changes to ensure correct framework is open
	useEffect(() => {
		if (
			isActiveFramework &&
			pathname.includes('/general') &&
			!expandedFolders.has(folderId)
		) {
			toggleFolder(folderId);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pathname, isActiveFramework]);

	return (
		<SidebarFolder
			defaultOpen={shouldDefaultOpen || isExpanded}
			onOpenChange={() => toggleFolder(folderId)}
		>
			{item.index ? (
				<SidebarFolderLink
					href={item.index.url}
					external={item.index.external}
					{...props}
				>
					{item.icon}
					{item.name}
				</SidebarFolderLink>
			) : (
				<SidebarFolderTrigger {...props}>
					{item.icon}
					{item.name}
				</SidebarFolderTrigger>
			)}
			<SidebarFolderContent>{props.children}</SidebarFolderContent>
		</SidebarFolder>
	);
}

function getOffset(level: number) {
	return `calc(var(--spacing) * ${(level > 1 ? level : 0) * 2 + 2})`;
}

function Border({ level, active }: { level: number; active?: boolean }) {
	if (level <= 1) return null;

	return (
		<div
			className={cn(
				'absolute inset-y-2 start-3 z-[2] w-px',
				active && 'bg-fd-primary'
			)}
		/>
	);
}
