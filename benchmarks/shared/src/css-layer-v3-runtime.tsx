'use client';

import { ConsentBanner } from '@c15t/react/v3/consent-banner';
import { ConsentDialog } from '@c15t/react/v3/consent-dialog';
import { ConsentWidget } from '@c15t/react/v3/consent-widget';
import { ConsentDraftProvider } from '@c15t/react/v3/draft';
import { useActiveUI, useSetActiveUI } from '@c15t/react/v3/hooks';
import { ConsentProvider } from '@c15t/react/v3/provider';
import buttonStyles from '@c15t/ui/styles/v3/button';
import { useEffect } from 'react';
import type { CssLayerEnvironmentId, CssLayerSurface } from './css-layer-types';

export type { CssLayerSurface } from './css-layer-types';

const V3_POLICY = {
	id: 'css-layer-v3-compat',
	model: 'opt-in' as const,
	consent: {
		categories: ['necessary', 'functionality', 'measurement', 'marketing'],
		scopeMode: 'permissive' as const,
	},
	ui: {
		mode: 'banner' as const,
	},
};

const V3_THEME = {
	colors: {
		primary: '#0f172a',
		primaryHover: '#1e293b',
		surface: '#ffffff',
		surfaceHover: '#f8fafc',
		border: '#cbd5e1',
		borderHover: '#94a3b8',
		text: '#0f172a',
		textMuted: '#475569',
		textOnPrimary: '#ffffff',
		overlay: 'rgba(15, 23, 42, 0.42)',
		switchTrack: '#dbe4f3',
		switchTrackActive: '#0f172a',
		switchThumb: '#ffffff',
	},
	radius: {
		sm: '0.375rem',
		md: '0.625rem',
		lg: '1rem',
	},
	shadows: {
		lg: '0 18px 48px rgba(15, 23, 42, 0.18)',
	},
	consentActions: {
		accept: { variant: 'primary' as const, mode: 'filled' as const },
	},
	slots: {
		/**
		 * Bare Tailwind utilities. Contract: these win WITHOUT !important in
		 * Tailwind 4 (cascade layers put c15t rules in `components`, utilities
		 * later). In Tailwind 3 (no layers) c15t base styles legitimately win
		 * by specificity — that env asserts the theme primary instead.
		 */
		buttonPrimary: 'bg-blue-600 text-red-500 rounded-none',
		/**
		 * Important-modifier utilities — the documented Tailwind 3 override
		 * path. Must win in every Tailwind env.
		 */
		buttonSecondary: '!bg-blue-600 !text-red-500 !rounded-none',
		consentBannerCard: 'css-layer-v3-banner-card',
		consentDialogCard: 'css-layer-v3-dialog-card',
		consentWidget: 'css-layer-v3-widget',
		consentWidgetAccordion: 'css-layer-v3-widget-accordion',
	},
} as const;

function ForceV3Surface({ surface }: { surface: CssLayerSurface | 'widget' }) {
	const activeUI = useActiveUI();
	const setActiveUI = useSetActiveUI();
	const target = surface === 'widget' ? 'dialog' : surface;

	// Provider init can reset activeUI after mount; re-assert the surface
	// under test whenever the store lands somewhere else.
	useEffect(() => {
		if (activeUI !== target) {
			setActiveUI(target);
		}
	}, [activeUI, setActiveUI, target]);

	return null;
}

function V3Surface({ surface }: { surface: CssLayerSurface | 'widget' }) {
	if (surface === 'banner') {
		return (
			<ConsentBanner
				disableAnimation
				legalLinks={['privacyPolicy', 'termsOfService']}
				primaryButton={['accept']}
			/>
		);
	}

	if (surface === 'dialog') {
		return (
			<ConsentDialog
				disableAnimation
				legalLinks={['privacyPolicy', 'termsOfService']}
			/>
		);
	}

	return <ConsentWidget />;
}

export function CssLayerV3ScenarioRenderer({
	environmentId,
	environmentLabel,
	surface,
}: {
	environmentId: CssLayerEnvironmentId;
	environmentLabel: string;
	surface: CssLayerSurface | 'widget';
}) {
	return (
		<ConsentProvider
			options={{
				mode: 'offline',
				offlinePolicy: {
					policy: V3_POLICY,
				},
				persistence: false,
				legalLinks: {
					privacyPolicy: {
						href: '/legal/privacy',
					},
					termsOfService: {
						href: '/legal/terms',
					},
				},
				theme: V3_THEME,
			}}
		>
			<ConsentDraftProvider>
				<ForceV3Surface surface={surface} />
				<main
					className="css-layer-page"
					data-environment={environmentId}
				>
					<div className="css-layer-shell css-layer-v3-shell">
						<section className="css-layer-hero">
							<div className="css-layer-copy">
								<p className="css-layer-eyebrow">
									v3 CSS Modules · {environmentLabel}
								</p>
								<h1 className="css-layer-title">
									React v3 {surface} compatibility check
								</h1>
								<p className="css-layer-description">
									This route imports the React /v3 components and the
									per-component @c15t/ui v3 style artifacts. The class-map entry
									for the shared button is loaded as{' '}
									<code>{buttonStyles.button}</code>.
								</p>
							</div>

							<aside className="css-layer-checklist">
								<p className="css-layer-checklist-label">Automated checks</p>
								<ul className="css-layer-checklist-items">
									<li>
										Primary consent button keeps c15t base chrome from @layer
										components.
									</li>
									<li>
										Tailwind utilities override background, text color, and
										radius without !important.
									</li>
									<li>
										Plain CSS renders the v3 components fully styled without
										Tailwind.
									</li>
								</ul>
							</aside>
						</section>

						<section className="css-layer-stage css-layer-v3-stage">
							<div
								className="css-layer-stage-grid"
								aria-hidden="true"
							>
								<span />
								<span />
								<span />
								<span />
							</div>
							<div className="css-layer-stage-copy">
								<p className="css-layer-stage-label">Route under test</p>
								<p className="css-layer-stage-route">/v3-matrix/{surface}</p>
							</div>
						</section>
					</div>
				</main>
				<V3Surface surface={surface} />
			</ConsentDraftProvider>
		</ConsentProvider>
	);
}
