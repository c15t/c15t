<script lang="ts">
	const steps = [
		{
			number: '01',
			title: 'Book Your Delivery',
			description: 'Enter pickup and delivery locations through our app or website. Get instant pricing and availability.',
		},
		{
			number: '02',
			title: 'Secure Packaging',
			description: 'Our team collects your package and secures it in our specialized lightweight carrier system.',
		},
		{
			number: '03',
			title: 'Pigeon Takes Flight',
			description: 'A trained carrier pigeon is dispatched with your package, flying the most direct route to the destination.',
		},
		{
			number: '04',
			title: 'Delivered & Confirmed',
			description: 'Package arrives at the destination hub and is delivered to the recipient with instant confirmation.',
		},
	];
</script>

<section id="how-it-works" class="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30">
	<div class="container mx-auto max-w-6xl">
		<div class="text-center space-y-4 mb-16">
			<h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance">How it works</h2>
			<p class="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
				Simple, efficient, and surprisingly fast
			</p>
		</div>

		<div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
			{#each steps as step}
				<div class="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-4 relative">
					<div class="text-6xl font-bold text-muted/20">{step.number}</div>
					<h3 class="text-xl font-semibold">{step.title}</h3>
					<p class="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>
