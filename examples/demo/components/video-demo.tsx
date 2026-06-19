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
				inline ? 'space-y-5' : 'space-y-6 border-border/80 border-t pt-8',
				className
			)}
		>
			<div className="max-w-3xl space-y-3">
				<p className="label-pixel text-muted-foreground">Blocked embeds</p>
				<h2
					className={cn(
						'font-semibold tracking-tight',
						inline ? 'text-xl' : 'text-2xl'
					)}
				>
					<code className="font-mono">{'<Frame>'}</code>
				</h2>
				<p className="text-muted-foreground text-sm leading-6 sm:text-base">
					Each video is wrapped in{' '}
					<code className="font-mono">{'<Frame category="…">'}</code>. It stays
					blocked until that category is allowed, then loads.
				</p>
			</div>

			<div className={cn('grid', inline ? 'gap-6' : 'gap-8 lg:grid-cols-2')}>
				<div className="space-y-3">
					<div>
						<h3 className="font-medium text-base">
							<code className="font-mono text-sm">category="measurement"</code>
						</h3>
						<p className="text-muted-foreground text-sm">
							Unlocks when measurement consent is given.
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
						<h3 className="font-medium text-base">
							<code className="font-mono text-sm">category="experience"</code>
						</h3>
						<p className="text-muted-foreground text-sm">
							Unlocks when experience consent is given.
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
