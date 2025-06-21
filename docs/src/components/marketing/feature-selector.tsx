import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '~/lib/cn';
import { BorderIcon } from './border-icon';

// Types
export interface FeatureProps extends HTMLAttributes<HTMLDivElement> {
	title: string;
	description: string;
	icon: ReactNode;
	index: number;
	comingSoon?: boolean;
}

interface RootProps extends HTMLAttributes<HTMLDivElement> {
	children: ReactNode;
}

// Components
const Root = forwardRef<HTMLDivElement, RootProps>(
	({ className, children, ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					'relative z-10 mx-auto grid grid-cols-1 border border-y sm:border-x-0 md:grid-cols-2 lg:grid-cols-4 dark:border-neutral-800',
					className
				)}
				{...props}
			>
				{children}
			</div>
		);
	}
);
Root.displayName = 'FeaturesRoot';

const Item = forwardRef<HTMLDivElement, FeatureProps>(
	(
		{ title, description, icon, index, comingSoon, className, ...props },
		ref
	) => {
		return (
			<div
				ref={ref}
				className={cn(
					'group/feature relative flex flex-col border py-10 lg:border-0 lg:border-r dark:border-neutral-800',
					(index === 0 || index === 4) && 'lg:border-l dark:border-neutral-800',
					index < 4 && 'lg:border-b dark:border-neutral-800',
					className
				)}
				{...props}
			>
				<BorderIcon className="-top-3 -left-3 absolute h-6 w-6 text-black dark:text-white" />
				<BorderIcon className="-bottom-3 -left-3 absolute h-6 w-6 text-black dark:text-white" />
				<BorderIcon className="-top-3 -right-3 absolute h-6 w-6 text-black dark:text-white" />
				<BorderIcon className="-bottom-3 -right-3 absolute h-6 w-6 text-black dark:text-white" />
				{index < 4 ? (
					<div className="pointer-events-none absolute inset-0 h-full w-full bg-linear-to-t from-neutral-100 to-transparent opacity-0 transition duration-200 group-hover/feature:opacity-100 dark:from-neutral-800" />
				) : (
					<div className="pointer-events-none absolute inset-0 h-full w-full bg-linear-to-b from-neutral-100 to-transparent opacity-0 transition duration-200 group-hover/feature:opacity-100 dark:from-neutral-800" />
				)}
				<div className="relative z-10 mb-4 px-10 text-neutral-600 dark:text-neutral-400">
					{icon}
				</div>
				{comingSoon && (
					<span className="absolute top-5 right-5 inline-flex items-center rounded-full border bg-fd-primary/10 px-2.5 py-0.5 font-semibold text-fd-primary text-xs">
						Coming Soon
					</span>
				)}
				<div className="relative z-10 mb-2 px-10 font-bold text-lg">
					<div className="absolute inset-y-0 left-0 h-6 w-1 origin-center rounded-tr-full rounded-br-full bg-neutral-300 transition-all duration-200 group-hover/feature:h-8 group-hover/feature:bg-blue-500 dark:bg-neutral-700" />

					<span className="inline-block text-neutral-800 transition duration-200 group-hover/feature:translate-x-2 dark:text-neutral-100">
						{title}
					</span>
				</div>
				<p className="relative z-10 max-w-xs px-10 text-neutral-600 text-sm dark:text-neutral-300">
					{description}
				</p>
			</div>
		);
	}
);
Item.displayName = 'FeaturesItem';

// Export as a namespace object
const Features = {
	Root,
	Item,
};

// Export the namespace as default
export default Features;
