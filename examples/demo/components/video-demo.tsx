'use client';

import { GoogleMap, YouTubeEmbed } from '@c15t/react';
import { cn } from '../lib/utils';

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function VideoDemo({
	className,
	inline = false,
}: {
	className?: string;
	inline?: boolean;
}) {
	const sectionClassName = inline
		? 'space-y-5'
		: 'space-y-6 border-border/80 border-t pt-8';
	const headingClassName = inline ? 'text-xl' : 'text-2xl';
	const gridClassName = inline ? 'gap-6' : 'gap-8 lg:grid-cols-2';

	const googleMapsDemo = googleMapsApiKey ? (
		<GoogleMap
			apiKey={googleMapsApiKey}
			center={{ lat: 40.7128, lng: -74.006 }}
			className="overflow-hidden rounded-[var(--frame-placeholder-border-radius)]"
			consentCategory="measurement"
			zoom={12}
		/>
	) : (
		<div className="flex h-80 items-center justify-center rounded-lg border border-border/80 bg-muted/20 px-6 text-center text-muted-foreground text-sm">
			Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to validate the Google Maps SDK
			wrapper locally.
		</div>
	);

	return (
		<section className={cn(sectionClassName, className)}>
			<div className="max-w-3xl space-y-3">
				<p className="label-pixel text-muted-foreground">
					Renderable integrations
				</p>
				<h2 className={cn('font-semibold tracking-tight', headingClassName)}>
					Consent-aware embeds and SDK widgets
				</h2>
				<p className="text-muted-foreground text-sm leading-6 sm:text-base">
					<code className="font-mono">YouTubeEmbed</code> keeps its iframe
					unmounted until consent is granted, while{' '}
					<code className="font-mono">GoogleMap</code> gates one shared SDK
					loader and creates a map per component.
				</p>
			</div>

			<div className={cn('grid', gridClassName)}>
				<div className="space-y-3">
					<div>
						<h3 className="font-medium text-base">
							<code className="font-mono text-sm">category="measurement"</code>
						</h3>
						<p className="text-muted-foreground text-sm">
							Unlocks when measurement consent is given.
						</p>
					</div>
					<YouTubeEmbed
						consentCategory="measurement"
						params={{ playsinline: true }}
						start={36}
						title="Measurement policy-gated video"
						videoId="gwqYfNWVPpk"
					/>
				</div>

				<div className="space-y-3">
					<div>
						<h3 className="font-medium text-base">
							<code className="font-mono text-sm">category="marketing"</code>
						</h3>
						<p className="text-muted-foreground text-sm">
							Unlocks when marketing consent is given.
						</p>
					</div>
					<YouTubeEmbed
						consentCategory="marketing"
						params={{ playsinline: true }}
						start={36}
						title="Marketing policy-gated video"
						videoId="gwqYfNWVPpk"
					/>
				</div>

				<div className={cn('space-y-3', !inline && 'lg:col-span-2')}>
					<div>
						<h3 className="font-medium text-base">Google Maps SDK</h3>
						<p className="text-muted-foreground text-sm">
							Loads one page-level Maps SDK after measurement consent.
						</p>
					</div>
					{googleMapsDemo}
				</div>
			</div>
		</section>
	);
}
