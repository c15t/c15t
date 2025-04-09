import { cn } from '~/lib/cn';

import { type CSSProperties, type HTMLAttributes, forwardRef } from 'react';

interface BorderTextProps extends HTMLAttributes<HTMLDivElement> {
	text: string;
}

export const BorderText = forwardRef<HTMLDivElement, BorderTextProps>(
	({ text, className, ...props }, ref) => {
		return (
			<div className="flex items-center justify-center">
				<span
					ref={ref}
					style={{ '--text': `'${text}'` } as CSSProperties}
					className={cn(
						'pointer-events-none relative text-center font-bold font-mono text-[6rem] leading-none before:bg-linear-to-b before:from-neutral-300 before:to-80% before:to-neutral-200/70 before:bg-clip-text before:text-transparent before:content-[var(--text)] after:absolute after:inset-0 after:bg-neutral-400/70 after:bg-clip-text after:text-transparent after:mix-blend-darken after:content-[var(--text)] dark:after:bg-neutral-600/70 dark:after:mix-blend-lighten dark:before:from-neutral-700/70 dark:before:to-neutral-800/30 after:[text-shadow:0_1px_0_white] dark:after:[text-shadow:0_1px_0_black]',
						className
					)}
					{...props}
				/>
			</div>
		);
	}
);

BorderText.displayName = 'BorderText';
