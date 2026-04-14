import { ArrowRight } from 'lucide-react';
import { Button } from './ui/button';

export function CTA() {
	return (
		<section className="py-20 px-4 sm:px-6 lg:px-8">
			<div className="container mx-auto max-w-4xl">
				<div className="bg-primary text-primary-foreground rounded-2xl p-12 text-center space-y-6">
					<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
						Ready to revolutionize your deliveries?
					</h2>
					<p className="text-lg opacity-90 max-w-2xl mx-auto text-pretty">
						Join thousands of London businesses already using PigeonPost for
						fast, reliable, and eco-friendly delivery.
					</p>
					<div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
						<Button size="lg" variant="secondary" className="text-base" asChild>
							<a href="#pricing">
								Start Free Trial
								<ArrowRight className="ml-2 h-4 w-4" />
							</a>
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="text-base bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
							asChild
						>
							<a href="#video-demo">Schedule Demo</a>
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}
