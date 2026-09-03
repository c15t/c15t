'use client';

import { Frame } from 'c15t/react';

import { cn } from '../lib/utils';

export const VideoDemo = ({
	className,
	inline = false,
}: {
	className?: string;
	inline?: boolean;
}) => {
	const sectionClassName = inline
		? 'space-y-5'
		: 'space-y-6 border-border/80 border-t pt-8';
	const headingClassName = inline ? 'text-xl' : 'text-2xl';
	const gridClassName = inline ? 'gap-6' : 'gap-8 lg:grid-cols-2';

	return (
		<section className={cn(sectionClassName, className)}>
			<div className="max-w-3xl space-y-3">
				<p className="label-pixel text-muted-foreground">
					Renderable integrations
				</p>
				<h2 className={cn('font-semibold tracking-tight', headingClassName)}>
					Consent-aware embeds
				</h2>
				<p className="text-muted-foreground text-sm leading-6 sm:text-base">
					<code className="font-mono">Frame</code> keeps third-party iframes
					unmounted until the matching consent category is granted.
				</p>
			</div>

			<div className={cn('grid', gridClassName)}>
				<div className="space-y-3">
					<div>
						<h3 className="text-base font-medium">
							<code className="font-mono text-sm">
								category=&quot;measurement&quot;
							</code>
						</h3>
						<p className="text-muted-foreground text-sm">
							Unlocks when measurement consent is given.
						</p>
					</div>
					<Frame category="measurement">
						<iframe
							allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
							className="aspect-video w-full rounded-lg"
							loading="lazy"
							sandbox="allow-presentation allow-scripts"
							src="https://www.youtube-nocookie.com/embed/gwqYfNWVPpk?start=36&playsinline=1"
							title="Measurement policy-gated video"
						/>
					</Frame>
				</div>

				<div className="space-y-3">
					<div>
						<h3 className="text-base font-medium">
							<code className="font-mono text-sm">
								category=&quot;marketing&quot;
							</code>
						</h3>
						<p className="text-muted-foreground text-sm">
							Unlocks when marketing consent is given.
						</p>
					</div>
					<Frame category="marketing">
						<iframe
							allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
							className="aspect-video w-full rounded-lg"
							loading="lazy"
							sandbox="allow-presentation allow-scripts"
							src="https://www.youtube-nocookie.com/embed/gwqYfNWVPpk?start=36&playsinline=1"
							title="Marketing policy-gated video"
						/>
					</Frame>
				</div>
			</div>
		</section>
	);
};
