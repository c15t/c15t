import Link from 'fumadocs-core/link';
import type React from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export function Cards(props: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			{...props}
			className={cn('@container grid grid-cols-2 gap-3', props.className)}
		>
			{props.children}
		</div>
	);
}

type CardProps = Omit<HTMLAttributes<HTMLElement>, 'title'> & {
	icon?: React.ReactNode;
	title: React.ReactNode;
	description?: React.ReactNode;
	href?: string;
	external?: boolean;
};

export function Card({
	icon,
	title,
	description,
	href,
	external,
	className,
	children,
	...restProps
}: CardProps) {
	const cardClasses = cn(
		'not-prose relative @max-lg:col-span-full flex h-full flex-col justify-between gap-8 rounded-xl bg-base-50 p-6 transition-colors dark:bg-white/2',
		className
	);

	if (href) {
		return (
			<Link href={href} external={external} data-card className={cardClasses}>
				{icon && (
					<div className="mb-2 w-fit rounded-lg border p-1.5 text-base-900 shadow-md dark:text-white [&_svg]:size-4">
						{icon}
					</div>
				)}
				<h3 className="font-medium text-base text-base-900 dark:text-white">
					{title}
				</h3>
				{description && (
					<p className="!my-0 mt-2 text-base-500 text-sm dark:text-base-400">
						{description}
					</p>
				)}

				{children && (
					<div className="prose-no-margin text-base-500 text-sm empty:hidden dark:text-base-400">
						{children}
					</div>
				)}
			</Link>
		);
	}

	return (
		<div
			{...(restProps as HTMLAttributes<HTMLDivElement>)}
			data-card
			className={cardClasses}
		>
			{icon && (
				<div className="not-prose mb-2 w-fit rounded-lg border bg-fd-muted p-1.5 text-base-900 shadow-md dark:text-white [&_svg]:size-4">
					{icon}
				</div>
			)}
			<h3 className="not-prose font-medium text-base text-base-900 dark:text-white">
				{title}
			</h3>
			{description && (
				<p className="!my-0 mt-2 text-base-500 text-sm dark:text-base-400">
					{description}
				</p>
			)}

			{children && (
				<div className="prose-no-margin text-base-500 text-sm empty:hidden dark:text-base-400">
					{children}
				</div>
			)}
		</div>
	);
}
