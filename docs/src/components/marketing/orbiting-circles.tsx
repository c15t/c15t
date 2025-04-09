import type { CSSProperties, ReactNode } from 'react';
import { cn } from '~/lib/cn';

export interface OrbitingCirclesProps {
	className?: string;
	children?: ReactNode;
	reverse?: boolean;
	duration?: number;
	delay?: number;
	radius?: number;
	path?: boolean;
}

export default function OrbitingCircles({
	className,
	children,
	reverse,
	duration = 20,
	delay = 10,
	radius = 50,
	path = true,
}: OrbitingCirclesProps) {
	return (
		<>
			{path && (
				// biome-ignore lint/a11y/noSvgWithoutTitle: <explanation>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					version="1.1"
					className="pointer-events-none absolute inset-0 size-full"
				>
					<circle
						className="stroke-1 stroke-border dark:stroke-border"
						cx="50%"
						cy="50%"
						r={radius}
						fill="none"
					/>
				</svg>
			)}

			<div
				style={
					{
						'--duration': duration,
						'--radius': radius,
						'--delay': -delay,
					} as CSSProperties
				}
				className={cn(
					'absolute flex size-[2rem] transform-gpu animate-orbit items-center justify-center rounded-full border border-border bg-background [animation-delay:calc(var(--delay)*1000ms)] dark:bg-background',
					{ '[animation-direction:reverse]': reverse },
					className
				)}
			>
				{children}
			</div>
		</>
	);
}
