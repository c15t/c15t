<script lang="ts">
	const stats = [
		{
			label: 'Average delivery time',
			sublabel: 'Across London',
			value: '15min',
		},
		{
			label: 'On-time delivery rate',
			sublabel: 'Industry leading',
			value: '99.8%',
		},
		{ label: 'Deliveries per month', sublabel: 'And growing', value: '50K+' },
		{
			label: 'Customer satisfaction',
			sublabel: 'From 10K+ reviews',
			value: '4.9/5',
		},
	];
</script>

<section class="bg-secondary/30 px-4 py-20 sm:px-6 lg:px-8">
	<div class="container mx-auto max-w-6xl">
		<div class="grid grid-cols-2 gap-8 lg:grid-cols-4">
			{#each stats as stat}
				<div class="space-y-2 text-center">
					<div class="text-4xl font-bold lg:text-5xl">{stat.value}</div>
					<div class="text-sm font-medium">{stat.label}</div>
					<div class="text-muted-foreground text-xs">{stat.sublabel}</div>
				</div>
			{/each}
		</div>
	</div>
</section>
