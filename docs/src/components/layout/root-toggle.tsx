'use client';
import { usePathname } from 'fumadocs-core/framework';
import Link from 'fumadocs-core/link';
import { useSidebar } from 'fumadocs-ui/contexts/sidebar';
import { ChevronDown } from 'lucide-react';
import { type HTMLAttributes, type ReactNode, useMemo, useState } from 'react';
import { cn } from '../../lib/cn';
import { isActive } from '../../lib/is-active';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { iconMap } from '../icons';

export interface Option {
	/**
	 * Redirect URL of the folder, usually the index page
	 */
	url: string;

	icon?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	
	/**
	 * Framework identifier for the icon map
	 */
	iconKey?: string;

	/**
	 * Detect from a list of urls
	 */
	urls?: Set<string>;

	props?: HTMLAttributes<HTMLElement>;
}

export function RootToggle({
	options,
	placeholder,
	defaultSelected,
	...props
}: {
	placeholder?: ReactNode;
	options: Option[];
	defaultSelected?: Option;
} & HTMLAttributes<HTMLButtonElement>) {
	const [open, setOpen] = useState(false);
	const { closeOnRedirect } = useSidebar();
	const pathname = usePathname();
	
	const pathSections = pathname.split('/').filter(Boolean);
	const currentPage = pathSections.length > 1 ? pathSections.slice(1).join('/') : '';
	const isRootPath = pathname === '/docs' || pathname === '/docs/';

	const selected = useMemo(() => {
		// If defaultSelected is provided and we're on the root path, use it
		if (defaultSelected && isRootPath) {
			return defaultSelected;
		}

		// For framework-specific paths (like /docs/nextjs, /docs/react)
		// find the tab that matches the current framework
		const currentFramework = pathSections.length > 1 ? pathSections[1] : '';
		
		if (currentFramework) {
			const frameworkTab = options.find(tab => {
				if (typeof tab.title === 'string') {
					return tab.title.toLowerCase() === currentFramework.toLowerCase();
				}
				return false;
			});
			
			if (frameworkTab) {
				return frameworkTab;
			}
		}
		
		// Fallback to the URL matching logic
		return options.findLast((item) =>
			item.urls
				? item.urls.has(
						pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
					)
				: isActive(item.url, pathname, true)
		);
	}, [options, pathname, defaultSelected, isRootPath, pathSections]);

	const onClick = () => {
		closeOnRedirect.current = false;
		setOpen(false);
	};
	
	// Map framework titles to icon keys
	const getIconKey = (item: Option): string | undefined => {
		if (item.iconKey) return item.iconKey;
		
		if (typeof item.title === 'string') {
			const title = item.title.toLowerCase();
			if (title === 'nextjs' || title === 'next.js') return 'next';
			if (title === 'react') return 'react';
			if (title === 'javascript') return 'js';
			if (title === 'hono') return 'hono';
		}
		return undefined;
	};
	
	// Get the icon component for the selected item
	const getIconComponent = (item: Option | undefined) => {
		if (!item) return null;
		if (item.icon) return item.icon;
		
		const iconKey = getIconKey(item);
		if (iconKey && iconKey in iconMap) {
			const IconComponent = iconMap[iconKey as keyof typeof iconMap];
			return <IconComponent className="size-6" />;
		}
		
		return null;
	};

	return (
		<div className="relative z-20 my-1">
			<div className="rounded-xl bg-fd-accent/10 px-1 pb-1 pt-1.5">
				<span className="mb-1.5 block px-2 text-xs font-medium">
					Select your framework
				</span>
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger
						{...props}
						className={cn(
							'flex h-10 w-full items-center justify-between gap-x-2 rounded-lg bg-fd-card py-2 pl-2.5 pr-3',
							'text-sm font-medium shadow-md outline-none transition-all hover:shadow-lg',
							props.className
						)}
					>
						<span className="flex items-center gap-2.5">
							<span className="flex-none" aria-hidden="true">
								{getIconComponent(selected)}
							</span>
							{selected?.title ?? placeholder}
						</span>
						<ChevronDown className="size-4 flex-none opacity-60" />
					</PopoverTrigger>
					<PopoverContent className="w-full p-1 rounded-lg shadow-lg border-0">
						<div className="grid gap-1">
							{options.map((item) => {
								if (isRootPath && (!item.title || typeof item.title !== 'string')) {
									return null;
								}
								
								const url = isRootPath
									? `/docs/${item.title?.toString().toLowerCase()}`
									: item.url;
								
								return (
									<Link
										key={url}
										href={url}
										className={cn(
											'flex flex-row items-center gap-2.5 rounded-md p-2 transition-colors',
											'hover:bg-fd-accent/10 hover:text-fd-accent-foreground',
											item === selected &&
												'bg-fd-accent/10 font-medium text-fd-primary'
										)}
										onClick={onClick}
									>
										<span className="flex-none" aria-hidden="true">
											{getIconComponent(item)}
										</span>
										{item.title}
									</Link>
								);
							})}
						</div>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
}

function Item(props: Option) {
	return (
		<>
			{props.icon}
			<div className="flex-1 text-start">
				<p className="font-medium text-sm">{props.title}</p>
				{props.description ? (
					<p className="text-fd-muted-foreground text-xs">
						{props.description}
					</p>
				) : null}
			</div>
		</>
	);
}
