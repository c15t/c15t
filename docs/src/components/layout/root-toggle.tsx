'use client';
import { usePathname } from 'fumadocs-core/framework';
import Link from 'fumadocs-core/link';
import { useSidebar } from 'fumadocs-ui/contexts/sidebar';
import { ChevronsUpDown } from 'lucide-react';
import { type HTMLAttributes, type ReactNode, useMemo, useState } from 'react';
import { cn } from '../../lib/cn';
import { isActive } from '../../lib/is-active';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

export interface Option {
	/**
	 * Redirect URL of the folder, usually the index page
	 */
	url: string;

	icon?: ReactNode;
	title: ReactNode;
	description?: ReactNode;

	/**
	 * Detect from a list of urls
	 */
	urls?: Set<string>;

	active?: boolean;

	props?: HTMLAttributes<HTMLElement>;
}

export function RootToggle({
	options,
	placeholder,
	onOptionClick,
	...props
}: {
	placeholder?: ReactNode;
	options: Option[];
	onOptionClick?: (title: string) => void;
} & HTMLAttributes<HTMLButtonElement>) {
	const [open, setOpen] = useState(false);
	const { closeOnRedirect } = useSidebar();
	const pathname = usePathname();

	const selected = useMemo(() => {
		// If an option has active=true, use that
		const activeOption = options.find((item) => item.active === true);
		if (activeOption) return activeOption;

		// Fall back to URL-based selection
		return options.findLast((item) =>
			item.urls
				? item.urls.has(
						pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
					)
				: isActive(item.url, pathname, true)
		);
	}, [options, pathname]);

	const onClick = (item: Option) => {
		closeOnRedirect.current = false;
		setOpen(false);

		// If custom click handler is provided, call it with the selected title
		if (onOptionClick && item.title) {
			onOptionClick(item.title.toString());
		}
	};

	const item = selected ? <Item {...selected} /> : placeholder;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			{item ? (
				<PopoverTrigger
					{...props}
					className={cn(
						'flex flex-row items-center gap-2.5 rounded-lg ps-2 pe-2 py-1.5 hover:text-fd-accent-foreground bg-fd-card border',
						props.className
					)}
				>
					{item}
					<ChevronsUpDown className="size-4 text-fd-muted-foreground" />
				</PopoverTrigger>
			) : null}
			<PopoverContent className="w-(--radix-popover-trigger-width) overflow-hidden p-0 shadow-md">
				{options.map((item) => (
					<Link
						key={item.url}
						href={item.url}
						onClick={() => onClick(item)}
						{...item.props}
						className={cn(
							'flex w-full flex-row items-center gap-2 px-3 py-2',
							selected === item || item.active
								? 'bg-fd-primary/10 text-fd-primary font-medium'
								: 'hover:bg-fd-accent/20',
							item.props?.className
						)}
					>
						<Item {...item} />
					</Link>
				))}
			</PopoverContent>
		</Popover>
	);
}

function Item(props: Option) {
	return (
		<>
			<>{props.icon}</>
			<div className="flex-1 text-start">
				<p className="text-sm font-medium">{props.title}</p>
				{props.description ? (
					<p className="text-xs text-fd-muted-foreground">
						{props.description}
					</p>
				) : null}
			</div>
		</>
	);
}
