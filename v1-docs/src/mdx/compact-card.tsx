import Link from 'fumadocs-core/link';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '~/lib/cn';

export function Cards(props: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			{...props}
			className={cn('@container grid grid-cols-2 gap-4', props.className)}
		>
			{props.children}
		</div>
	);
}

export type CardProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
	icon?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	href?: string;
	external?: boolean;
};

export function Card({ icon, title, description, ...props }: CardProps) {
	const E = props.href ? Link : 'div';

	return (
		<E
			{...props}
			data-card
			className={cn(
				'@max-lg:col-span-full block rounded-lg border bg-fd-card p-4 text-fd-card-foreground shadow-md transition-colors',
				props.href && 'hover:bg-fd-accent/80',
				props.className
			)}
		>
			{icon ? (
				<div className="not-prose mb-2 w-fit rounded-md border bg-fd-muted p-1.5 text-fd-muted-foreground [&_svg]:size-4">
					{icon}
				</div>
			) : null}
			<h3 className="not-prose mb-1 font-medium text-sm">{title}</h3>
			{description ? (
				<p className="!my-0 text-fd-muted-foreground text-sm">{description}</p>
			) : null}
			{props.children ? (
				<div className="prose-no-margin text-fd-muted-foreground text-sm">
					{props.children}
				</div>
			) : null}
		</E>
	);
}

/**
 * A compact card component with left icon, content area, and right arrow.
 * Designed to be used as a navigation element or action item.
 */
export type CompactCardProps = {
	/** URL the card links to */
	href: string;
	/** Icon to display on the left side */
	icon?: ReactNode;
	/** Main content of the card */
	children: ReactNode;
	/** Whether the link opens in a new tab */
	external?: boolean;
	/** Additional CSS classes */
	className?: string;
};

export function CompactCard({
	href,
	icon,
	children,
	external,
	className,
}: CompactCardProps) {
	return (
		<Link
			href={href}
			target={external ? '_blank' : undefined}
			rel={external ? 'noopener noreferrer' : undefined}
			className={cn(
				'not-prose group mb-4 flex rounded-md border border-fd-border bg-fd-card text-fd-card-foreground no-underline shadow-md transition-all duration-200 hover:bg-fd-accent',
				className
			)}
		>
			{icon && (
				<div className="flex w-14 items-center justify-center border-fd-border border-r bg-fd-muted/50 py-4 text-fd-muted-foreground transition-colors duration-200 group-hover:text-fd-primary">
					{icon}
				</div>
			)}
			<div className="flex-auto p-4 group-hover:text-fd-primary [&>p>code]:rounded-md [&>p>code]:bg-fd-primary/10 [&>p>code]:p-1 [&>p>code]:font-mono [&>p>code]:text-fd-primary [&>p>code]:text-xs [&>p]:m-0">
				{children}
			</div>
			<div className="flex w-14 items-center justify-center text-fd-muted-foreground group-hover:text-fd-primary">
				<svg
					aria-hidden="true"
					aria-label="Navigate to page"
					className="transform transition-transform duration-200 group-hover:translate-x-1"
					fill="none"
					height="16"
					viewBox="0 0 16 16"
					width="16"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						clipRule="evenodd"
						d="M9.53 2.22L9 1.69 7.94 2.75l.53.53 3.97 3.97H1v1.5h11.44l-3.97 3.97-.53.53L9 14.31l.53-.53 5.074-5.073a1 1 0 000-1.414L9.53 2.22z"
						fill="currentColor"
						fillRule="evenodd"
					/>
				</svg>
			</div>
		</Link>
	);
}
