'use client';

import { offline } from '@c15t/react';
import { ConsentBanner } from '@c15t/react/consent-banner';
import { ConsentDialog } from '@c15t/react/consent-dialog';
import { ConsentWidget } from '@c15t/react/consent-widget';
import { ConsentDraftProvider } from '@c15t/react/draft';
import { useActiveUI, useSetActiveUI } from '@c15t/react/hooks';
import { ConsentProvider } from '@c15t/react/provider';
import buttonStyles from '@c15t/ui/styles/components/button';
import { useEffect } from 'react';

import type { CssLayerEnvironmentId, CssLayerSurface } from './css-layer-types';

export type { CssLayerSurface } from './css-layer-types';

const POLICY = {
	id: 'benchmark-opt-in',
	match: { isDefault: true },
	model: 'opt-in' as const,
	prompt: 'choice' as const,
};

const THEME = {
	colors: {
		border: '#cbd5e1',
		borderHover: '#94a3b8',
		overlay: 'rgba(15, 23, 42, 0.42)',
		primary: '#0f172a',
		primaryHover: '#1e293b',
		surface: '#ffffff',
		surfaceHover: '#f8fafc',
		switchThumb: '#ffffff',
		switchTrack: '#dbe4f3',
		switchTrackActive: '#0f172a',
		text: '#0f172a',
		textMuted: '#475569',
		textOnPrimary: '#ffffff',
	},
	consentActions: {
		accept: { mode: 'filled' as const, variant: 'primary' as const },
	},
	radius: {
		lg: '1rem',
		md: '0.625rem',
		sm: '0.375rem',
	},
	shadows: {
		lg: '0 18px 48px rgba(15, 23, 42, 0.18)',
	},
} as const;

const COMPONENTS = {
	accordion: {
		root: { className: 'css-layer-v3-widget-accordion' },
	},
	banner: {
		card: { className: 'css-layer-v3-banner-card' },
	},
	button: {
		/**
		 * Bare Tailwind utilities. Contract: these win WITHOUT !important in
		 * Tailwind 4 (cascade layers put c15t rules in `components`, utilities
		 * later). In Tailwind 3 (no layers) c15t base styles legitimately win
		 * by specificity — that env asserts the theme primary instead.
		 */
		primary: { className: 'bg-blue-600 text-red-500 rounded-none' },
		/**
		 * Important-modifier utilities — the documented Tailwind 3 override
		 * path. Must win in every Tailwind env.
		 */
		secondary: { className: '!bg-blue-600 !text-red-500 !rounded-none' },
	},
	dialog: {
		card: { className: 'css-layer-v3-dialog-card' },
	},
	manager: {
		root: { className: 'css-layer-v3-widget' },
	},
} as const;

const ForceSurface = ({ surface }: { surface: CssLayerSurface | 'widget' }) => {
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
};

const Surface = ({ surface }: { surface: CssLayerSurface | 'widget' }) => {
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
};

export const CssLayerScenarioRenderer = ({
	environmentId,
	environmentLabel,
	surface,
}: {
	environmentId: CssLayerEnvironmentId;
	environmentLabel: string;
	surface: CssLayerSurface | 'widget';
}) => (
	<ConsentProvider
		options={{
			components: COMPONENTS,
			legalLinks: {
				privacyPolicy: {
					href: '/legal/privacy',
				},
				termsOfService: {
					href: '/legal/terms',
				},
			},
			mode: offline({ policyRules: [POLICY] }),
			persistence: false,
			theme: THEME,
		}}
	>
		<ConsentDraftProvider>
			<ForceSurface surface={surface} />
			<main
				className="css-layer-page"
				data-environment={environmentId}
			>
				<div className="css-layer-shell css-layer-v3-shell">
					<section className="css-layer-hero">
						<div className="css-layer-copy">
							<p className="css-layer-eyebrow">
								CSS Modules · {environmentLabel}
							</p>
							<h1 className="css-layer-title">
								React {surface} compatibility check
							</h1>
							<p className="css-layer-description">
								This route imports the React components and the per-component
								@c15t/ui style artifacts. The class-map entry for the shared
								button is loaded as <code>{buttonStyles.button}</code>.
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
									Tailwind utilities override background, text color, and radius
									without !important.
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
							<p className="css-layer-stage-route">/matrix/{surface}</p>
						</div>
					</section>
				</div>
			</main>
			<Surface surface={surface} />
		</ConsentDraftProvider>
	</ConsentProvider>
);
