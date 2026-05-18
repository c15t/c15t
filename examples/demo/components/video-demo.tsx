'use client';

import { C15TGoogleMap, C15TYouTubeEmbed } from '@c15t/react';
import { cn } from '../lib/utils';

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function VideoDemo({
	className,
	inline = false,
}: {
	className?: string;
	inline?: boolean;
}) {
	let sectionClassName = 'space-y-6 border-border/80 border-t pt-8';
	let headingClassName = 'text-2xl';
	let gridClassName = 'gap-8 lg:grid-cols-2';
	let googleMapsDemo = (
		<div className="flex h-80 items-center justify-center rounded-lg border border-border/80 bg-muted/20 px-6 text-center text-muted-foreground text-sm">
			Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to validate the Google Maps SDK
			wrapper locally.
		</div>
	);

	if (inline) {
		sectionClassName = 'space-y-5';
		headingClassName = 'text-xl';
		gridClassName = 'gap-6';
	}

	if (googleMapsApiKey) {
		googleMapsDemo = (
			<C15TGoogleMap
				apiKey={googleMapsApiKey}
				center={{ lat: 40.7128, lng: -74.006 }}
				consentCategory="measurement"
				style={{ height: 320, width: '100%' }}
				zoom={12}
			/>
		);
	}

	return (
		<section className={cn(sectionClassName, className)}>
			<div className="max-w-3xl space-y-3">
				<p className="label-pixel text-muted-foreground">
					Renderable integrations
				</p>
				<h2 className={cn('font-semibold tracking-tight', headingClassName)}>
					Policy-gated media and maps
				</h2>
				<p className="text-muted-foreground text-sm leading-6 sm:text-base">
					These examples use <code className="font-mono">C15TYouTubeEmbed</code>{' '}
					for iframe media and <code className="font-mono">C15TGoogleMap</code>{' '}
					for an SDK-backed widget behind the active consent policy.
				</p>
			</div>

			<div className={cn('grid', gridClassName)}>
				<div className="space-y-3">
					<div>
						<h3 className="font-medium text-base">Measurement category</h3>
						<p className="text-muted-foreground text-sm">
							Use this to validate media that should unlock only when
							measurement is allowed.
						</p>
					</div>
					<C15TYouTubeEmbed
						consentCategory="measurement"
						className="relative aspect-video w-full"
						iframeClassName="inset-0 h-full w-full"
						src="https://www.youtube.com/embed/gwqYfNWVPpk?si=eEtKAUke_JUXTMfl&start=36"
						title="Measurement policy-gated video"
					/>
					<div className="space-y-3">
						<h3 className="font-medium text-base">Google Maps SDK</h3>
						{googleMapsDemo}
					</div>
				</div>

				<div className="space-y-3">
					<div>
						<h3 className="font-medium text-base">Experience category</h3>
						<p className="text-muted-foreground text-sm">
							This one stays blocked until the active policy and consent state
							allow the experience category.
						</p>
					</div>
					<C15TYouTubeEmbed
						consentCategory="experience"
						className="relative aspect-video w-full"
						iframeClassName="inset-0 h-full w-full"
						src="https://www.youtube.com/embed/gwqYfNWVPpk?si=eEtKAUke_JUXTMfl&start=36"
						title="Experience policy-gated video"
					/>
				</div>
			</div>
		</section>
	);
}
