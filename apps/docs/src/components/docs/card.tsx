import Link from 'fumadocs-core/link';
import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import { cn } from '~/lib/cn';

export function Cards(props: HTMLAttributes<HTMLDivElement>): ReactElement {
	return (
		<div
			{...props}
			className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', props.className)}
		>
			{props.children}
		</div>
	);
}

export type CardProps = HTMLAttributes<HTMLElement> & {
	icon?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	href?: string;
	external?: boolean;
	showBackgroundIcon?: boolean;
};

export function Card({
	icon,
	title,
	description,
	showBackgroundIcon = true,
	...props
}: CardProps): ReactElement {
	const E = props.href ? Link : 'div';

	return (
		<E
			{...props}
			data-card
			className={cn(
				'group block rounded-lg border bg-fd-card p-4 text-fd-card-foreground shadow transition-all duration-200',
				'hover:border-fd-primary/20 hover:shadow-fd-primary/5 hover:shadow-lg',
				'relative overflow-hidden',
				props.href && 'hover:bg-fd-accent/80',
				props.className
			)}
		>
			{/* Main content */}
			<div className="relative z-10">
				{icon ? (
					<div className="not-prose mb-2 w-fit rounded-md border bg-gradient-to-t from-fd-primary/5 to-fd-background/80 p-1.5 text-fd-primary/80 transition-colors group-hover:border-fd-primary/30 group-hover:text-fd-primary [&_svg]:size-8">
						{icon}
					</div>
				) : null}
				<h3 className="not-prose mb-1 font-medium text-sm tracking-tight transition-colors group-hover:text-fd-primary">
					{title}
				</h3>
				{description ? (
					<p className="my-0 text-fd-muted-foreground text-sm transition-colors group-hover:text-fd-muted-foreground/80">
						{description}
					</p>
				) : null}
				{props.children ? (
					<div className="prose-no-margin text-fd-muted-foreground text-sm">
						{props.children}
					</div>
				) : null}
			</div>

			{/* Background effects */}
			<div className="absolute inset-0 z-1 bg-gradient-to-t from-transparent to-fd-primary/[0.4] opacity-0 transition-opacity group-hover:opacity-100" />

			{/* Background icon */}
			{showBackgroundIcon && icon && (
				<div className="-right-6 -translate-y-1/2 group-hover:-right-4 absolute top-1/2 z-2 opacity-[0.02] transition-all duration-300 group-hover:opacity-[0.04]">
					<div className="rotate-12 text-fd-card-foreground [&_svg]:size-32">
						{icon}
					</div>
				</div>
			)}
		</E>
	);
}

export type CardSlimProps = HTMLAttributes<HTMLElement> & {
	icon?: ReactNode;
	content: ReactNode;
	href: string;
	external?: boolean;
};

export function CardSlim({
	icon,
	content,
	href,
	external,
	...props
}: CardSlimProps): ReactElement {
	return (
		<Link
			{...props}
			href={href}
			external={external}
			className={cn(
				'text-base font-normal no-underline flex rounded-md border hover:shadow-sm mb-4',
				'border-fd-border text-fd-foreground',
				props.className
			)}
		>
			{icon && (
				<div className="flex w-14 items-center justify-center border-r border-fd-border">
					<div className="text-fd-muted-foreground">{icon}</div>
				</div>
			)}
			<div className="flex-auto p-4 [&>p]:m-0">{content}</div>
			<div className="flex w-14 items-center justify-center text-fd-muted-foreground">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					fill="none"
				>
					<path
						fill="currentColor"
						fillRule="evenodd"
						d="M9.53 2.22L9 1.69 7.94 2.75l.53.53 3.97 3.97H1v1.5h11.44l-3.97 3.97-.53.53L9 14.31l.53-.53 5.074-5.073a1 1 0 000-1.414L9.53 2.22z"
						clipRule="evenodd"
					/>
				</svg>
			</div>
		</Link>
	);
}
