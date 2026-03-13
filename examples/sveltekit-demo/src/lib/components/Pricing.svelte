<script lang="ts">
	const plans = [
		{
			name: 'Starter',
			price: '\u00a39',
			period: 'per delivery',
			description: 'Perfect for occasional senders',
			features: [
				'Up to 500g packages',
				'Standard delivery (15-30 min)',
				'Real-time tracking',
				'Email notifications',
				'Basic support',
			],
			popular: false,
		},
		{
			name: 'Business',
			price: '\u00a3199',
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
			popular: false,
		},
	];
</script>

<section id="pricing" class="py-20 px-4 sm:px-6 lg:px-8">
	<div class="container mx-auto max-w-6xl">
		<div class="text-center space-y-4 mb-16">
			<h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
				Simple, transparent pricing
			</h2>
			<p class="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
				Choose the plan that works for you. No hidden fees, no surprises.
			</p>
		</div>

		<div class="grid md:grid-cols-3 gap-6">
			{#each plans as plan}
				<div class="rounded-lg border bg-card text-card-foreground shadow-sm p-8 space-y-6 {plan.popular ? 'border-2 border-accent shadow-lg' : ''}">
					<div class="space-y-2">
						<div class="flex items-center gap-2">
							<h3 class="font-bold text-2xl">{plan.name}</h3>
							{#if plan.popular}
								<div class="inline-block rounded-full bg-accent px-3 py-1 font-medium text-accent-foreground text-xs">
									Most Popular
								</div>
							{/if}
						</div>
						<p class="text-muted-foreground text-sm">{plan.description}</p>
					</div>
					<div class="space-y-1">
						<div class="text-4xl font-bold">{plan.price}</div>
						<div class="text-sm text-muted-foreground">{plan.period}</div>
					</div>
					<button class="w-full inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 {plan.popular ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground'}">
						Get Started
					</button>
					<div class="space-y-3 pt-4">
						{#each plan.features as feature}
							<div class="flex items-start gap-3">
								<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent shrink-0 mt-0.5"><path d="M20 6 9 17l-5-5"/></svg>
								<span class="text-sm">{feature}</span>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
