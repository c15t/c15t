'use client';

import { Frame } from '@c15t/react';

export function VideoDemo() {
	return (
		<section id="video-demo" className="py-24 bg-background">
			<div className="container mx-auto px-4">
				<div className="max-w-4xl mx-auto">
					<div className="text-center mb-12">
						<h2 className="text-4xl font-bold mb-4 text-balance">
							Policy-Gated Iframe Demo
						</h2>
						<p className="text-xl text-muted-foreground text-balance">
							The first iframe is in-policy for restricted JP
							(necessary+measurement). The second requires experience and stays
							blocked when that purpose is out of policy.
						</p>
					</div>

					<div className="grid gap-10">
						<div>
							<h3 className="font-semibold mb-3">Measurement Category</h3>
							<Frame
								category="measurement"
								className="relative w-full aspect-video"
							>
								<iframe
									src="https://www.youtube.com/embed/gwqYfNWVPpk?si=eEtKAUke_JUXTMfl&amp;start=36"
									title="Measurement Policy-Gated Video"
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
									allowFullScreen
									className="inset-0 w-full h-full"
								/>
							</Frame>
						</div>

						<div>
							<h3 className="font-semibold mb-3">Experience Category</h3>
							<Frame
								category="experience"
								className="relative w-full aspect-video"
							>
								<iframe
									src="https://www.youtube.com/embed/gwqYfNWVPpk?si=eEtKAUke_JUXTMfl&amp;start=36"
									title="Experience Policy-Gated Video"
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
									allowFullScreen
									className="inset-0 w-full h-full"
								/>
							</Frame>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
