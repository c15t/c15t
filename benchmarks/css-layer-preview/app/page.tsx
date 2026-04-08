import { listCssLayerScenarios } from '@c15t/benchmarking';

export default function Home() {
	const scenarios = listCssLayerScenarios();

	return (
		<main className="matrix-home">
			<section className="matrix-home-nav">
				<div className="matrix-home-nav-copy">
					<p className="matrix-home-eyebrow">Manual CSS Matrix</p>
					<h1>Tailwind 3, Tailwind 4, and plain CSS side by side</h1>
				</div>
				<div className="matrix-home-summary">
					<div>
						<span>3 environments</span>
						<strong>TW3, TW4, plain CSS</strong>
					</div>
					<div>
						<span>Current scope</span>
						<strong>Banner and dialog</strong>
					</div>
				</div>
			</section>

			<ul className="matrix-home-list">
				{scenarios.map((scenario) => (
					<li key={scenario.id}>
						<a href={`/matrix/${scenario.surface}/${scenario.fixtureKind}`}>
							<span>{scenario.title}</span>
							<code>{`/matrix/${scenario.surface}/${scenario.fixtureKind}`}</code>
						</a>
					</li>
				))}
			</ul>
		</main>
	);
}
