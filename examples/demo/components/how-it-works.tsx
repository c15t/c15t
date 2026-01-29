import { Card } from './ui/card';

export function HowItWorks() {
	const steps = [
		{
			number: '01',
			title: 'Book Your Delivery',
			description:
				'Enter pickup and delivery locations through our app or website. Get instant pricing and availability.',
		},
		{
			number: '02',
			title: 'Secure Packaging',
			description:
				'Our team collects your package and secures it in our specialized lightweight carrier system.',
		},
		{
			number: '03',
			title: 'Pigeon Takes Flight',
			description:
				'A trained carrier pigeon is dispatched with your package, flying the most direct route to the destination.',
		},
		{
			number: '04',
			title: 'Delivered & Confirmed',
			description:
				'Package arrives at the destination hub and is delivered to the recipient with instant confirmation.',
		},
	];

	return (
		<section
			id="how-it-works"
			className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30"
		>
			<div className="container mx-auto max-w-6xl">
				<div className="text-center space-y-4 mb-16">
					<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
						How it works
					</h2>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
						Simple, efficient, and surprisingly fast
					</p>
				</div>

				<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
					{steps.map((step, index) => (
						<Card key={index} className="p-6 space-y-4 relative">
							<div className="text-6xl font-bold text-muted/20">
								{step.number}
							</div>
							<h3 className="text-xl font-semibold">{step.title}</h3>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{step.description}
							</p>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
