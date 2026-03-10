'use client';

import { Frame } from '@c15t/react';

export function VideoDemo() {
	return (
		<section id="video-demo" className="py-24 bg-background">
			<div className="container mx-auto px-4">
				<div className="max-w-4xl mx-auto">
					<div className="text-center mb-12">
						<h2 className="text-4xl font-bold mb-4 text-balance">
							See PigeonPost in Action
						</h2>
						<p className="text-xl text-muted-foreground text-balance">
							Watch how our revolutionary pigeon-powered delivery system works
						</p>
					</div>

					<Frame category="experience" className="relative w-full aspect-video">
						<iframe
							src="https://www.youtube.com/embed/gwqYfNWVPpk?si=eEtKAUke_JUXTMfl&amp;start=36"
							title="PigeonPost Demo Video"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
							allowFullScreen
							className="inset-0 w-full h-full"
						/>
					</Frame>
				</div>
			</div>
		</section>
	);
}
