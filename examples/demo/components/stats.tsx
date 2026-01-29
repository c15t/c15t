export function Stats() {
	const stats = [
		{
			value: '15min',
			label: 'Average delivery time',
			sublabel: 'Across London',
		},
		{
			value: '99.8%',
			label: 'On-time delivery rate',
			sublabel: 'Industry leading',
		},
		{ value: '50K+', label: 'Deliveries per month', sublabel: 'And growing' },
		{
			value: '4.9/5',
			label: 'Customer satisfaction',
			sublabel: 'From 10K+ reviews',
		},
	];

	return (
		<section className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary/30">
			<div className="container mx-auto max-w-6xl">
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
					{stats.map((stat, index) => (
						<div key={index} className="text-center space-y-2">
							<div className="text-4xl lg:text-5xl font-bold">{stat.value}</div>
							<div className="text-sm font-medium">{stat.label}</div>
							<div className="text-xs text-muted-foreground">
								{stat.sublabel}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
