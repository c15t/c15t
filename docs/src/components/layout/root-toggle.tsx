'use client';
import { usePathname } from 'fumadocs-core/framework';
import Link from 'fumadocs-core/link';
import { useSidebar } from 'fumadocs-ui/contexts/sidebar';
import { ChevronDown } from 'lucide-react';
import {
	type HTMLAttributes,
	type ReactNode,
	useEffect,
	useState,
} from 'react';
import { cn } from '../../lib/cn';
import { iconMap } from '../icons';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { useFramework } from './framework-context';

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

/**
 * Find the option matching a framework name
 */
function findFrameworkOption(
	options: Option[],
	framework: string
): Option | undefined {
	return options.find(
		(option) =>
			typeof option.title === 'string' &&
			option.title.toLowerCase() === framework.toLowerCase()
	);
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
	const { activeFramework, setActiveFramework } = useFramework();

	// Find the option matching the active framework
	const [selectedOption, setSelectedOption] = useState<Option | undefined>(
		defaultSelected
	);

	// Update selected option when framework changes
	useEffect(() => {
		if (activeFramework) {
			const option = findFrameworkOption(options, activeFramework);
			if (option) {
				setSelectedOption(option);
			}
		}
	}, [activeFramework, options]);

	const handleFrameworkChange = (option: Option) => {
		closeOnRedirect.current = false;
		setOpen(false);

		// Set the selected option
		setSelectedOption(option);

		// Update the active framework in context
		if (typeof option.title === 'string') {
			setActiveFramework(option.title.toLowerCase());
		}
	};

	// Map framework titles to icon keys
	const getIconKey = (item: Option): string | undefined => {
		if (item.iconKey) {
			return item.iconKey;
		}

		if (typeof item.title === 'string') {
			const title = item.title.toLowerCase();
			if (title === 'nextjs' || title === 'next.js') {
				return 'next';
			}
			if (title === 'react') {
				return 'react';
			}
			if (title === 'javascript') {
				return 'js';
			}
			if (title === 'hono') {
				return 'hono';
			}
		}
		return undefined;
	};

	// Get the icon component for the selected item
	const getIconComponent = (item: Option | undefined) => {
		if (!item) {
			return null;
		}
		if (item.icon) {
			return item.icon;
		}

		const iconKey = getIconKey(item);
		if (iconKey && iconKey in iconMap) {
			const IconComponent = iconMap[iconKey as keyof typeof iconMap];
			return (
				<IconComponent
					className={cn(iconKey === 'react' && 'text-[#53C1DE]', 'size-6')}
				/>
			);
		}

		return null;
	};

	// When linking to a framework from the framework dropdown,
	// create the proper framework URL
	const getFrameworkUrl = (item: Option) => {
		if (pathname === '/docs' || pathname === '/docs/') {
			// For root page, link to the framework root
			return `/docs/${item.title?.toString().toLowerCase()}`;
		}

		// For framework-specific links, use the item's URL
		return item.url;
	};

	return (
		<div className="relative z-20 my-1">
			<div className="rounded-xl bg-fd-accent/10 px-1 pt-1.5 pb-1">
				<span className="mb-1.5 block px-2 font-medium text-xs">
					Select your framework
				</span>
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger
						{...props}
						className={cn(
							'flex h-10 w-full items-center justify-between gap-x-2 rounded-lg bg-fd-card py-2 pr-3 pl-2.5',
							'font-medium text-sm shadow-md outline-none transition-all hover:shadow-lg',
							props.className
						)}
					>
						<span className="flex items-center gap-2.5">
							<span className="flex-none" aria-hidden="true">
								{getIconComponent(selectedOption)}
							</span>
							{selectedOption?.title ?? placeholder}
						</span>
						<ChevronDown className="size-4 flex-none opacity-60" />
					</PopoverTrigger>
					<PopoverContent className="w-full rounded-lg border-0 p-1 shadow-lg">
						<div className="grid gap-1">
							{options.map((item) => {
								if (
									(pathname === '/docs' || pathname === '/docs/') &&
									(!item.title || typeof item.title !== 'string')
								) {
									return null;
								}

								const url = getFrameworkUrl(item);

								return (
									<Link
										key={url}
										href={url}
										className={cn(
											'flex flex-row items-center gap-2.5 rounded-md p-2 transition-colors',
											'hover:bg-fd-accent/10 hover:text-fd-accent-foreground',
											item === selectedOption &&
												'bg-fd-accent/10 font-medium text-fd-primary'
										)}
										onClick={() => handleFrameworkChange(item)}
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
