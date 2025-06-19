'use client';

import { forwardRef, type ReactNode, useRef } from 'react';
import { cn } from '~/lib/cn';

interface SectionProps {
	id?: string;
	title?: string;
	subtitle?: string;
	description?: string;
	children?: ReactNode;
	className?: string;
	align?: 'left' | 'center' | 'right';
}

const Section = forwardRef<HTMLElement, SectionProps>(
	(
		{ id, title, subtitle, description, children, className, align },
		forwardedRef
	) => {
		const internalRef = useRef<HTMLElement>(null);
		const ref = forwardedRef || internalRef;

		const alignmentClasses = {
			left: 'text-left',
			right: 'text-right',
			center: 'text-center',
		} as const;

		const alignmentClass = alignmentClasses[align ?? 'center'];

		const marginClasses = {
			left: '',
			right: 'ml-auto',
			center: 'mx-auto',
		} as const;

		const marginClass = marginClasses[align ?? 'center'];

		return (
			<section id={id} ref={ref} className="px-4 sm:px-6 md:px-8">
				<div className={cn('mx-auto max-w-7xl', className)}>
					{(title || subtitle || description) && (
						<div
							className={cn(
								alignmentClass,
								'relative mx-auto overflow-hidden p-2 py-8 md:p-12 lg:pt-24 lg:pb-16'
							)}
						>
							{title && (
								<h2 className="text-center font-semibold text-3xl leading-8 sm:text-center sm:text-4xl sm:leading-6">
									{title}
								</h2>
							)}

							{subtitle && (
								<h3
									className={cn(
										'mx-0 mt-4 max-w-lg text-balance font-bold text-5xl text-foreground lowercase leading-[1.2] tracking-tighter sm:max-w-none sm:text-4xl md:text-5xl lg:text-6xl',
										marginClass
									)}
								>
									{subtitle}
								</h3>
							)}
							{description && (
								<p
									className={cn(
										'mt-6 max-w-2xl text-balance text-lg text-muted-foreground leading-8',
										marginClass
									)}
								>
									{description}
								</p>
							)}
							<div className="-z-10 pointer-events-none absolute right-0 bottom-0 left-0 h-full w-full bg-linear-to-t from-50% from-background dark:from-background" />
							{/* <FlickeringGrid
                squareSize={4}
                gridGap={4}
                color="#6B7280"
                maxOpacity={0.2}
                flickerChance={0.1}
                className="-z-20 absolute inset-0 size-full"
              /> */}
						</div>
					)}
					{children}
				</div>
			</section>
		);
	}
);

Section.displayName = 'Section';

export { Section };
