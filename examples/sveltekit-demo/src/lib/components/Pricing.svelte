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

<section
	id="pricing"
	class="px-4 py-20 sm:px-6 lg:px-8"
>
	<div class="container mx-auto max-w-6xl">
		<div class="mb-16 space-y-4 text-center">
			<h2 class="text-3xl font-bold text-balance sm:text-4xl lg:text-5xl">
				Simple, transparent pricing
			</h2>
			<p class="text-muted-foreground mx-auto max-w-2xl text-lg text-pretty">
				Choose the plan that works for you. No hidden fees, no surprises.
			</p>
		</div>

		<div class="grid gap-6 md:grid-cols-3">
			{#each plans as plan}
				<div
					class="bg-card text-card-foreground space-y-6 rounded-lg border p-8 shadow-sm {plan.popular
						? 'border-accent border-2 shadow-lg'
						: ''}"
				>
					<div class="space-y-2">
						<div class="flex items-center gap-2">
							<h3 class="text-2xl font-bold">{plan.name}</h3>
							{#if plan.popular}
								<div
									class="bg-accent text-accent-foreground inline-block rounded-full px-3 py-1 text-xs font-medium"
								>
									Most Popular
								</div>
							{/if}
						</div>
						<p class="text-muted-foreground text-sm">{plan.description}</p>
					</div>
					<div class="space-y-1">
						<div class="text-4xl font-bold">{plan.price}</div>
						<div class="text-muted-foreground text-sm">{plan.period}</div>
					</div>
					<button
						class="inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-sm font-medium {plan.popular
							? 'bg-primary text-primary-foreground hover:bg-primary/90'
							: 'border-input hover:bg-accent hover:text-accent-foreground border bg-transparent'}"
					>
						Get Started
					</button>
					<div class="space-y-3 pt-4">
						{#each plan.features as feature}
							<div class="flex items-start gap-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="text-accent mt-0.5 shrink-0"
									><path d="M20 6 9 17l-5-5" /></svg
								>
								<span class="text-sm">{feature}</span>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
