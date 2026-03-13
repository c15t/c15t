<section id="features" class="py-20 px-4 sm:px-6 lg:px-8">
	<div class="container mx-auto max-w-6xl">
		<div class="text-center space-y-4 mb-16">
			<h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">
				Why choose PigeonPost?
			</h2>
			<p class="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
				Revolutionary technology meets nature's most reliable courier system
			</p>
		</div>

		<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each features as feature}
				<div class="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 space-y-4 hover:shadow-lg transition-shadow">
					<div class="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
						{@html feature.icon}
					</div>
					<h3 class="text-xl font-semibold">{feature.title}</h3>
					<p class="text-muted-foreground text-sm leading-relaxed">
						{feature.description}
					</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<script lang="ts">
	const features = [
		{
			icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 text-accent"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>',
			title: 'Lightning Fast',
			description: 'Our pigeons fly direct routes, avoiding traffic entirely. Average delivery time of just 15 minutes across London.',
		},
		{
			icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 text-accent"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
			title: 'Secure & Reliable',
			description: 'Military-grade tracking and trained carrier pigeons ensure your packages arrive safely every time.',
		},
		{
			icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 text-accent"><path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1 3.5-3 8.5c1-1 2.5-1 3.5 0s1 2.5 0 3.5-2.5 1-3.5 0c-5 4-8.5 3-8.5 3s1.4-1.5 5.5-7.2"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
			title: 'Zero Emissions',
			description: 'Completely carbon-neutral delivery. Help the environment while getting your packages delivered.',
		},
		{
			icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 text-accent"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
			title: '24/7 Service',
			description: 'Round-the-clock delivery service with real-time tracking and instant notifications.',
		},
		{
			icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 text-accent"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
			title: 'City-Wide Coverage',
			description: 'Complete coverage across all London zones. From Heathrow to Canary Wharf, we deliver everywhere.',
		},
		{
			icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 text-accent"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16h8"/><path d="M7 11h12"/><path d="M7 6h3"/></svg>',
			title: 'Analytics Dashboard',
			description: 'Track all your deliveries, view analytics, and optimize your shipping with our powerful dashboard.',
		},
	];
</script>
