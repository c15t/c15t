import { getCssLayerScenario, listCssLayerScenarios } from '@c15t/benchmarking';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MatrixFrame } from '@/components/matrix-frame';
import {
	cssLayerEnvironments,
	getEnvironmentUrl,
} from '@/lib/environment-urls';

const SURFACE_HEIGHTS = {
	banner: 520,
	dialog: 620,
} as const;

export default async function MatrixPreviewPage({
	params,
}: {
	params: Promise<{ scenario: string; surface: 'banner' | 'dialog' }>;
}) {
	const resolvedParams = await params;
	const scenario = getCssLayerScenario(
		resolvedParams.surface,
		resolvedParams.scenario
	);

	if (!scenario) {
		notFound();
	}

	const scenarios = listCssLayerScenarios();
	const frameHeight = SURFACE_HEIGHTS[scenario.surface];

	return (
		<main className="matrix-shell">
			<header className="matrix-header">
				<div className="matrix-header-top">
					<div className="matrix-header-copy">
						<div className="matrix-header-eyebrow-row">
							<p className="matrix-header-eyebrow">Manual CSS Matrix</p>
							<span className="matrix-header-surface">
								{scenario.surface === 'banner'
									? 'Banner Surface'
									: 'Dialog Surface'}
							</span>
						</div>
						<h1>{scenario.title}</h1>
					</div>

					<p className="matrix-header-description">{scenario.description}</p>
				</div>

				<nav aria-label="Scenario navigation">
					<ul className="matrix-scenario-tabs">
						{scenarios.map((item) => {
							const href = `/matrix/${item.surface}/${item.fixtureKind}`;
							const isActive = item.id === scenario.id;

							return (
								<li key={item.id}>
									<Link
										className={`matrix-scenario-tab${isActive ? ' is-active' : ''}`}
										href={href}
									>
										<span>{item.title}</span>
									</Link>
								</li>
							);
						})}
					</ul>
				</nav>

				<div className="matrix-header-meta">
					<span>{cssLayerEnvironments.length} environments</span>
					<span>
						{scenario.surface === 'banner' ? '520px preview' : '620px preview'}
					</span>
				</div>
			</header>

			<section className="matrix-expectations matrix-expectations-inline">
				<div className="matrix-expectations-copy">
					<h2>Review Checks</h2>
					<p>Visual acceptance criteria for this scenario.</p>
				</div>
				<ul>
					{scenario.expectations.map((expectation) => (
						<li key={expectation}>{expectation}</li>
					))}
				</ul>
			</section>

			<section className="matrix-grid">
				{cssLayerEnvironments.map((environment) => (
					<MatrixFrame
						key={environment.id}
						description={environment.description}
						height={frameHeight}
						label={environment.label}
						port={environment.port}
						url={getEnvironmentUrl(
							environment.port,
							scenario.surface,
							scenario.fixtureKind
						)}
					/>
				))}
			</section>
		</main>
	);
}
