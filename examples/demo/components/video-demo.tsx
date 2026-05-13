'use client';

import { Frame } from '@c15t/react';
import { cn } from '../lib/utils';

export function VideoDemo({
	className,
	inline = false,
}: {
	className?: string;
	inline?: boolean;
}) {
	return (
		<section
			className={cn(
				inline ? 'space-y-5' : 'space-y-6 border-t border-border/80 pt-8',
				className
			)}
		>
			<div className="max-w-3xl space-y-3">
				<p className="label-pixel text-muted-foreground">Iframe gating</p>
				<h2
					className={cn(
						'font-semibold tracking-tight',
						inline ? 'text-xl' : 'text-2xl'
					)}
				>
					Policy-gated embeds with <code className="font-mono">Frame</code>
				</h2>
				<p className="text-sm leading-6 text-muted-foreground sm:text-base">
					These embeds are wrapped with the React{' '}
					<code className="font-mono">Frame</code> component, so access follows
					the active consent policy for the current scenario.
				</p>
			</div>

			<div className={cn('grid', inline ? 'gap-6' : 'gap-8 lg:grid-cols-2')}>
				<div className="space-y-3">
					<div>
						<h3 className="font-medium text-base">Measurement category</h3>
						<p className="text-sm text-muted-foreground">
							Use this to validate media that should unlock only when
							measurement is allowed.
						</p>
					</div>
					<Frame
						category="measurement"
						className="relative aspect-video w-full"
					>
						<iframe
							src="https://www.youtube.com/embed/gwqYfNWVPpk?si=eEtKAUke_JUXTMfl&amp;start=36"
							title="Measurement policy-gated video"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
							allowFullScreen
							className="inset-0 h-full w-full"
						/>
					</Frame>
				</div>

				<div className="space-y-3">
					<div>
						<h3 className="font-medium text-base">Experience category</h3>
						<p className="text-sm text-muted-foreground">
							This one stays blocked until the active policy and consent state
							allow the experience category.
						</p>
					</div>
					<Frame category="experience" className="relative aspect-video w-full">
						<iframe
							src="https://www.youtube.com/embed/gwqYfNWVPpk?si=eEtKAUke_JUXTMfl&amp;start=36"
							title="Experience policy-gated video"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
							allowFullScreen
							className="inset-0 h-full w-full"
						/>
					</Frame>
				</div>
			</div>
		</section>
	);
}
