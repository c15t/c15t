'use client';

import Link from 'fumadocs-core/link';
import { SidebarTrigger } from 'fumadocs-core/sidebar';
import { useNav } from 'fumadocs-ui/contexts/layout';
import { useSidebar } from 'fumadocs-ui/contexts/sidebar';
import { Menu, X } from 'lucide-react';
import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { useEffect, useId, useState } from 'react';
import { cn } from '../../lib/cn';
import { useFramework } from '../layout/framework-context';
import type { Option } from '../layout/root-toggle';
import { buttonVariants } from '../ui/button';

export function Navbar({
	mode,
	...props
}: HTMLAttributes<HTMLElement> & { mode: 'top' | 'auto' }) {
	const { open, collapsed } = useSidebar();
	const { isTransparent } = useNav();

	return (
		<header
			id={useId()}
			{...props}
			className={cn(
				'fixed inset-x-0 top-(--fd-banner-height) z-20 px-(--fd-layout-offset) backdrop-blur-lg transition-colors',
				(!isTransparent || open) && 'bg-fd-background/80',
				mode === 'auto' &&
					!collapsed &&
					'ps-[calc(var(--fd-layout-offset)+var(--fd-sidebar-width))]',
				props.className
			)}
		>
			{props.children}
		</header>
	);
}

export function NavbarSidebarTrigger(
	props: ButtonHTMLAttributes<HTMLButtonElement>
) {
	const { open } = useSidebar();

	return (
		<SidebarTrigger
			{...props}
			className={cn(
				buttonVariants({
					color: 'ghost',
					size: 'icon',
				}),
				props.className
			)}
		>
			{open ? <X /> : <Menu />}
		</SidebarTrigger>
	);
}

export function LayoutTabs(props: HTMLAttributes<HTMLElement>) {
	return (
		<div
			{...props}
			role="tablist"
			className={cn(
				'flex flex-row items-end gap-6 overflow-auto',
				props.className
			)}
		>
			{props.children}
		</div>
	);
}

/**
 * Hook to check if a tab is selected based on framework context
 */
function useIsTabSelected(item: Option) {
	const { activeFramework } = useFramework();
	const [isSelected, setIsSelected] = useState(false);

	useEffect(() => {
		// Check if this tab matches the active framework
		if (typeof item.title === 'string' && activeFramework) {
			setIsSelected(item.title.toLowerCase() === activeFramework.toLowerCase());
		} else {
			setIsSelected(false);
		}
	}, [item, activeFramework]);

	return isSelected;
}

export function LayoutTab(props: Option & { forceActive?: boolean }) {
	const { closeOnRedirect } = useSidebar();
	const isSelected = useIsTabSelected(props);
	const { setActiveFramework } = useFramework();
	const selected = props.forceActive || isSelected;

	const handleClick = () => {
		closeOnRedirect.current = false;

		// Update the active framework
		if (typeof props.title === 'string') {
			setActiveFramework(props.title.toLowerCase());
		}
	};

	return (
		<Link
			className={cn(
				'inline-flex items-center gap-2 text-nowrap border-transparent border-b py-2.5 text-fd-muted-foreground text-sm',
				selected && 'border-fd-primary font-medium text-fd-foreground'
			)}
			role="tab"
			aria-selected={selected}
			href={props.url}
			onClick={handleClick}
		>
			{props.title}
		</Link>
	);
}

export function SidebarLayoutTab({
	item,
	forceActive,
	...props
}: {
	item: Option;
	forceActive?: boolean;
} & HTMLAttributes<HTMLElement>) {
	const isSelected = useIsTabSelected(item);
	const { setActiveFramework } = useFramework();
	const { closeOnRedirect } = useSidebar();

	const selected = forceActive || isSelected;

	const handleClick = () => {
		closeOnRedirect.current = false;
		// Update the active framework
		if (typeof item.title === 'string') {
			setActiveFramework(item.title.toLowerCase());
		}
	};

	return (
		<Link
			{...props}
			className={cn(
				'-mx-2 [&_svg]:!size-4.5 flex flex-row items-center gap-2.5 px-2 py-1.5 text-fd-muted-foreground',
				selected
					? 'font-medium text-fd-primary'
					: 'hover:text-fd-accent-foreground',
				props.className
			)}
			data-active={selected}
			href={item.url}
			onClick={handleClick}
		>
			{item.icon}
			{item.title}
		</Link>
	);
}
