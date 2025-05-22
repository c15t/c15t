import { Card, Cards } from '../../../components/card';
import { Section } from '../../../components/marketing/section';

import { examples } from '../examples';

export function ExampleGrid() {
	return (
		<Section
			id="examples"
			title="Examples"
			description="Get started with examples of how to use c15t in your application"
		>
			<Cards className="grid-cols-3">
				{examples.map((example, index) => (
					<Card
						key={index}
						title={example.title}
						description={example.description}
						icon={example.icon}
						href={example.href}
						external={example.external}
						image={example.image}
					/>
				))}
			</Cards>
		</Section>
	);
}
