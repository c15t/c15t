'use client';

import {
	ConsentBanner,
	type ConsentBannerProps,
	ConsentDialog,
	type ConsentDialogProps,
	ConsentManagerProvider,
	useConsentManager,
} from '@c15t/react';
import { useEffect } from 'react';
import type {
	CssLayerEnvironmentId,
	CssLayerScenario,
	CssLayerSurface,
} from './css-layer-types';

function cx(...values: Array<string | undefined>) {
	return values.filter(Boolean).join(' ');
}

function ForceSurface({ surface }: { surface: CssLayerSurface }) {
	const { setActiveUI } = useConsentManager();

	useEffect(() => {
		setActiveUI(surface, { force: true });
	}, [setActiveUI, surface]);

	return null;
}

function ScenarioSurface({ scenario }: { scenario: CssLayerScenario }) {
	if (scenario.surface === 'banner') {
		const bannerProps: ConsentBannerProps = scenario.surfaceProps.banner ?? {};
		return <ConsentBanner {...bannerProps} />;
	}

	const dialogProps: ConsentDialogProps = scenario.surfaceProps.dialog ?? {};
	return <ConsentDialog {...dialogProps} />;
}

export function CssLayerScenarioRenderer({
	environmentId,
	environmentLabel,
	isPreview = false,
	scenario,
}: {
	environmentId: CssLayerEnvironmentId;
	environmentLabel: string;
	isPreview?: boolean;
	scenario: CssLayerScenario;
}) {
	const resolvedTheme =
		scenario.themeByEnvironment?.[environmentId] ?? scenario.theme;

	return (
		<ConsentManagerProvider
			options={{
				...scenario.providerOptions,
				theme: resolvedTheme,
			}}
		>
			<ForceSurface surface={scenario.surface} />
			{isPreview ? (
				<main className="css-layer-preview-page">
					<section
						className={cx(
							'css-layer-preview-stage',
							scenario.pageFrame.stageClassName,
							scenario.surface === 'dialog'
								? 'css-layer-preview-stage-dialog'
								: 'css-layer-preview-stage-banner'
						)}
					>
						<div className="css-layer-stage-grid" aria-hidden="true">
							<span />
							<span />
							<span />
							<span />
						</div>
					</section>
				</main>
			) : (
				<main className="css-layer-page">
					<div
						className={cx('css-layer-shell', scenario.pageFrame.shellClassName)}
					>
						<section
							className={cx('css-layer-hero', scenario.pageFrame.heroClassName)}
						>
							<div className="css-layer-copy">
								<p className="css-layer-eyebrow">
									{scenario.pageFrame.eyebrow} · {environmentLabel}
								</p>
								<h1 className="css-layer-title">{scenario.pageFrame.title}</h1>
								<p className="css-layer-description">
									{scenario.pageFrame.description}
								</p>

								<div className="css-layer-highlights">
									{scenario.pageFrame.highlights.map((highlight) => (
										<article
											key={highlight.label}
											className="css-layer-highlight"
										>
											<p className="css-layer-highlight-label">
												{highlight.label}
											</p>
											<p className="css-layer-highlight-value">
												{highlight.value}
											</p>
										</article>
									))}
								</div>
							</div>

							<aside className="css-layer-checklist">
								<p className="css-layer-checklist-label">Review this route</p>
								<ul className="css-layer-checklist-items">
									{scenario.expectations.map((expectation) => (
										<li key={expectation}>{expectation}</li>
									))}
								</ul>
							</aside>
						</section>

						<section
							className={cx(
								'css-layer-stage',
								scenario.pageFrame.stageClassName,
								scenario.surface === 'dialog'
									? 'css-layer-stage-dialog'
									: 'css-layer-stage-banner'
							)}
						>
							<div className="css-layer-stage-grid" aria-hidden="true">
								<span />
								<span />
								<span />
								<span />
							</div>
							<div className="css-layer-stage-copy">
								<p className="css-layer-stage-label">
									{scenario.pageFrame.stageLabel}
								</p>
								<p className="css-layer-stage-route">
									/{`matrix/${scenario.surface}/${scenario.fixtureKind}`}
								</p>
							</div>
						</section>
					</div>
				</main>
			)}
			<ScenarioSurface scenario={scenario} />
		</ConsentManagerProvider>
	);
}
