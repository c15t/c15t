<script lang="ts">
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
</script>

<section
	id="testimonials"
	class="bg-secondary/30 px-4 py-20 sm:px-6 lg:px-8"
>
	<div class="container mx-auto max-w-6xl">
		<div class="mb-16 space-y-4 text-center">
			<h2 class="text-3xl font-bold text-balance sm:text-4xl lg:text-5xl">
				Trusted by London's best
			</h2>
			<p class="text-muted-foreground mx-auto max-w-2xl text-lg text-pretty">
				See what our customers have to say about PigeonPost
			</p>
		</div>

		<div class="grid gap-6 md:grid-cols-3">
			{#each testimonials as testimonial}
				<div
					class="bg-card text-card-foreground space-y-4 rounded-lg border p-6 shadow-sm"
				>
					<div class="flex gap-1">
						{#each Array(testimonial.rating) as _}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="currentColor"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="text-accent"
							>
								<polygon
									points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
								/>
							</svg>
						{/each}
					</div>
					<p class="text-sm leading-relaxed">{testimonial.content}</p>
					<div class="border-border border-t pt-4">
						<div class="font-semibold">{testimonial.name}</div>
						<div class="text-muted-foreground text-sm">
							{testimonial.role}, {testimonial.company}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
