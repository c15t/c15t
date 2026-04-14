import { Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

export function Pricing() {
	const plans = [
		{
			name: 'Starter',
			price: '£9',
			period: 'per delivery',
			description: 'Perfect for occasional senders',
			features: [
				'Up to 500g packages',
				'Standard delivery (15-30 min)',
				'Real-time tracking',
				'Email notifications',
				'Basic support',
			],
		},
		{
			name: 'Business',
			price: '£199',
			period: 'per month',
			description: 'For growing businesses',
			features: [
				'Up to 2kg packages',
				'Priority delivery (10-20 min)',
				'Real-time tracking',
				'SMS & email notifications',
				'Analytics dashboard',
				'API access',
				'Priority support',
				'50 deliveries included',
			],
			popular: true,
		},
		{
			name: 'Enterprise',
			price: 'Custom',
			period: 'contact us',
			description: 'For large organizations',
			features: [
				'Unlimited package weight',
				'Express delivery (5-15 min)',
				'Real-time tracking',
				'Multi-channel notifications',
				'Advanced analytics',
				'Full API access',
				'Dedicated account manager',
				'Custom integrations',
				'SLA guarantee',
			],
		},
	];

	return (
		<section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
			<div className="container mx-auto max-w-6xl">
				<div className="text-center space-y-4 mb-16">
					<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
						Simple, transparent pricing
					</h2>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
						Choose the plan that works for you. No hidden fees, no surprises.
					</p>
				</div>

				<div className="grid md:grid-cols-3 gap-6">
					{plans.map((plan, index) => (
						<Card
							key={index}
							className={`p-8 space-y-6 ${
								plan.popular ? 'border-2 border-accent shadow-lg' : ''
							}`}
						>
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<h3 className="font-bold text-2xl">{plan.name}</h3>
									{plan.popular && (
										<div className="inline-block rounded-full bg-accent px-3 py-1 font-medium text-accent-foreground text-xs">
											Most Popular
										</div>
									)}
								</div>
								<p className="text-muted-foreground text-sm">
									{plan.description}
								</p>
							</div>
							<div className="space-y-1">
								<div className="text-4xl font-bold">{plan.price}</div>
								<div className="text-sm text-muted-foreground">
									{plan.period}
								</div>
							</div>
							<Button
								className="w-full"
								variant={plan.popular ? 'default' : 'outline'}
							>
								Get Started
							</Button>
							<div className="space-y-3 pt-4">
								{plan.features.map((feature, featureIndex) => (
									<div key={featureIndex} className="flex items-start gap-3">
										<Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
										<span className="text-sm">{feature}</span>
									</div>
								))}
							</div>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
