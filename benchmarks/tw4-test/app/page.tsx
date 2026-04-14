import { listCssLayerScenarios } from '@c15t/benchmarking';

export default function Home() {
	const scenarios = listCssLayerScenarios();

	return (
		<main className="css-layer-home">
			<div className="css-layer-home-copy">
				<p className="css-layer-home-eyebrow">Tailwind CSS 4 Environment</p>
				<h1 className="css-layer-home-title">
					c15t component-layer review routes
				</h1>
				<p className="css-layer-home-description">
					This app isolates the Tailwind CSS 4 pipeline. Use it beside the TW3
					and plain-CSS apps to inspect how component defaults, utility
					overrides, and merge behavior compare across environments.
				</p>
			</div>

			<ul className="css-layer-home-list">
				{scenarios.map((scenario) => (
					<li key={scenario.id}>
						<a
							className="css-layer-home-link"
							href={`/matrix/${scenario.surface}/${scenario.fixtureKind}`}
						>
							<span>{scenario.title}</span>
							<code>{`/matrix/${scenario.surface}/${scenario.fixtureKind}`}</code>
						</a>
					</li>
				))}
			</ul>
		</main>
	);
}
