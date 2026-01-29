import { Star } from 'lucide-react';
import { Card } from './ui/card';

export function Testimonials() {
	const testimonials = [
		{
			name: 'Sarah Mitchell',
			role: 'Operations Manager',
			company: 'TechStart London',
			content:
				'PigeonPost has revolutionized our same-day delivery needs. The speed is incredible and our customers love the eco-friendly approach.',
			rating: 5,
		},
		{
			name: 'James Chen',
			role: 'Founder',
			company: 'Artisan Bakery Co.',
			content:
				'We deliver fresh pastries across London every morning. PigeonPost ensures they arrive warm and on time, every single day.',
			rating: 5,
		},
		{
			name: 'Emma Thompson',
			role: 'Logistics Director',
			company: 'Fashion Forward',
			content:
				"The analytics dashboard gives us incredible insights. We've optimized our delivery routes and cut costs by 40%.",
			rating: 5,
		},
	];

	return (
		<section
			id="testimonials"
			className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30"
		>
			<div className="container mx-auto max-w-6xl">
				<div className="text-center space-y-4 mb-16">
					<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
						Trusted by London's best
					</h2>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
						See what our customers have to say about PigeonPost
					</p>
				</div>

				<div className="grid md:grid-cols-3 gap-6">
					{testimonials.map((testimonial, index) => (
						<Card key={index} className="p-6 space-y-4">
							<div className="flex gap-1">
								{Array.from({ length: testimonial.rating }).map((_, i) => (
									<Star key={i} className="h-4 w-4 fill-accent text-accent" />
								))}
							</div>
							<p className="text-sm leading-relaxed">{testimonial.content}</p>
							<div className="pt-4 border-t border-border">
								<div className="font-semibold">{testimonial.name}</div>
								<div className="text-sm text-muted-foreground">
									{testimonial.role}, {testimonial.company}
								</div>
							</div>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
