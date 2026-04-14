'use client';
import { ArrowRight } from 'lucide-react';
import { Button } from './ui/button';

export function Hero() {
	return (
		<section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
			<div className="container mx-auto max-w-6xl">
				<div className="text-center space-y-8">
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm">
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
							<span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
						</span>
						Now serving all of London
					</div>

					<h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
						The fastest courier service in London
					</h1>

					<p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
						Revolutionary pigeon-powered delivery that's fast, reliable, and
						surprisingly efficient. Experience the future of urban logistics
						today.
					</p>

					<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
						<Button size="lg" className="text-base" asChild>
							<a href="#pricing">
								Start Shipping
								<ArrowRight className="ml-2 h-4 w-4" />
							</a>
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="text-base bg-transparent"
							asChild
						>
							<a href="#video-demo">View Demo</a>
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="text-base bg-transparent"
							asChild
						>
							<button
								onClick={async () => {
									const res = await fetch(
										' https://api.github.com/user/65376239',
										{
											method: 'GET',
											headers: {
												'Content-Type': 'application/json',
											},
										}
									);
									console.log('res', res);
								}}
							>
								Fetch
							</button>
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}
