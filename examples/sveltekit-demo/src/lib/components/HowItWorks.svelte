<script lang="ts">
	const steps = [
		{
			description:
				'Enter pickup and delivery locations through our app or website. Get instant pricing and availability.',
			number: '01',
			title: 'Book Your Delivery',
		},
		{
			description:
				'Our team collects your package and secures it in our specialized lightweight carrier system.',
			number: '02',
			title: 'Secure Packaging',
		},
		{
			description:
				'A trained carrier pigeon is dispatched with your package, flying the most direct route to the destination.',
			number: '03',
			title: 'Pigeon Takes Flight',
		},
		{
			description:
				'Package arrives at the destination hub and is delivered to the recipient with instant confirmation.',
			number: '04',
			title: 'Delivered & Confirmed',
		},
	];
</script>

<section
	id="how-it-works"
	class="bg-secondary/30 px-4 py-20 sm:px-6 lg:px-8"
>
	<div class="container mx-auto max-w-6xl">
		<div class="mb-16 space-y-4 text-center">
			<h2 class="text-3xl font-bold text-balance sm:text-4xl lg:text-5xl">
				How it works
			</h2>
			<p class="text-muted-foreground mx-auto max-w-2xl text-lg text-pretty">
				Simple, efficient, and surprisingly fast
			</p>
		</div>

		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
			{#each steps as step}
				<div
					class="bg-card text-card-foreground relative space-y-4 rounded-lg border p-6 shadow-sm"
				>
					<div class="text-muted/20 text-6xl font-bold">{step.number}</div>
					<h3 class="text-xl font-semibold">{step.title}</h3>
					<p class="text-muted-foreground text-sm leading-relaxed">
						{step.description}
					</p>
				</div>
			{/each}
		</div>
	</div>
</section>
