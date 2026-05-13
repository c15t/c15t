<script lang="ts">
	const stats = [
		{ value: '15min', label: 'Average delivery time', sublabel: 'Across London' },
		{ value: '99.8%', label: 'On-time delivery rate', sublabel: 'Industry leading' },
		{ value: '50K+', label: 'Deliveries per month', sublabel: 'And growing' },
		{ value: '4.9/5', label: 'Customer satisfaction', sublabel: 'From 10K+ reviews' },
	];
</script>

<section class="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30">
	<div class="container mx-auto max-w-6xl">
		<div class="grid grid-cols-2 lg:grid-cols-4 gap-8">
			{#each stats as stat}
				<div class="text-center space-y-2">
					<div class="text-4xl lg:text-5xl font-bold">{stat.value}</div>
					<div class="text-sm font-medium">{stat.label}</div>
					<div class="text-xs text-muted-foreground">{stat.sublabel}</div>
				</div>
			{/each}
		</div>
	</div>
</section>
