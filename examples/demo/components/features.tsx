import { BarChart3, Clock, Leaf, MapPin, Shield, Zap } from 'lucide-react';
import { Card } from './ui/card';

export function Features() {
	const features = [
		{
			icon: Zap,
			title: 'Lightning Fast',
			description:
				'Our pigeons fly direct routes, avoiding traffic entirely. Average delivery time of just 15 minutes across London.',
		},
		{
			icon: Shield,
			title: 'Secure & Reliable',
			description:
				'Military-grade tracking and trained carrier pigeons ensure your packages arrive safely every time.',
		},
		{
			icon: Leaf,
			title: 'Zero Emissions',
			description:
				'Completely carbon-neutral delivery. Help the environment while getting your packages delivered.',
		},
		{
			icon: Clock,
			title: '24/7 Service',
			description:
				'Round-the-clock delivery service with real-time tracking and instant notifications.',
		},
		{
			icon: MapPin,
			title: 'City-Wide Coverage',
			description:
				'Complete coverage across all London zones. From Heathrow to Canary Wharf, we deliver everywhere.',
		},
		{
			icon: BarChart3,
			title: 'Analytics Dashboard',
			description:
				'Track all your deliveries, view analytics, and optimize your shipping with our powerful dashboard.',
		},
	];

	return (
		<section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
			<div className="container mx-auto max-w-6xl">
				<div className="text-center space-y-4 mb-16">
					<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
						Why choose PigeonPost?
					</h2>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
						Revolutionary technology meets nature's most reliable courier system
					</p>
				</div>

				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
					{features.map((feature, index) => (
						<Card
							key={index}
							className="p-6 space-y-4 hover:shadow-lg transition-shadow"
						>
							<div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
								<feature.icon className="h-6 w-6 text-accent" />
							</div>
							<h3 className="text-xl font-semibold">{feature.title}</h3>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{feature.description}
							</p>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
