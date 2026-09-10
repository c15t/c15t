'use client';

import {
	ConsentDialogLink,
	Frame,
	useConsent,
	usePersistence,
} from 'c15t/next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { posthogConfigured, xPixelConfigured } from '../lib/scripts';
import type { BannerDesign } from './consent';

const designs: { value: BannerDesign; label: string }[] = [
	{ label: 'Default', value: 'default' },
	{ label: 'Branded', value: 'branded' },
	{ label: 'Custom', value: 'custom' },
];

const IntegrationStatus = ({
	configured,
	allowed,
}: {
	configured: boolean;
	allowed: boolean;
}) => {
	if (!configured) {
		return <span className="status">Not configured</span>;
	}
	return (
		<span
			className="status"
			data-allowed={allowed}
		>
			{allowed ? 'Allowed' : 'Blocked'}
		</span>
	);
};

export const Demo = ({
	children,
	design,
	onDesignChange,
	showTrigger,
	onTriggerChange,
}: {
	children: ReactNode;
	design: BannerDesign;
	onDesignChange: (design: BannerDesign) => void;
	showTrigger: boolean;
	onTriggerChange: (visible: boolean) => void;
}) => {
	const measurementAllowed = useConsent('measurement');
	const marketingAllowed = useConsent('marketing');
	// The boundary disables its automatic persistence so this is the sole owner.
	// Its public clear() method resets only c15t records, not other site storage.
	const persistence = usePersistence();

	const reset = () => {
		persistence.clear();
		// Reload also removes previously executed vendor code and its globals.
		window.location.reload();
	};

	return (
		<div className="demo-shell">
			<header className="site-header">
				<a
					className="wordmark"
					href="/app-router"
					aria-label="c15t example home"
				>
					c15t<span> / next.js</span>
				</a>
				<nav aria-label="Example routes">
					<Link href="/app-router">App Router</Link>
					<Link href="/pages-router">Pages Router</Link>
					<Link href="/client-init">Browser init</Link>
				</nav>
			</header>
			<main>
				<section className="intro">
					<p className="eyebrow">A working Next.js example</p>
					<h1>Consent example</h1>
					<p className="lede">Make a choice. See what changes.</p>
					<p>
						Video and analytics follow your permissions. Reject, allow a
						category, or reopen your preferences to try another choice.
					</p>
					{children}
				</section>

				<section
					className="design-panel"
					aria-labelledby="design-heading"
				>
					<div>
						<h2 id="design-heading">Choose a banner design</h2>
						<p>The same policy and actions, with different presentation.</p>
					</div>
					<div className="design-controls">
						<fieldset
							className="design-buttons"
							aria-label="Banner design"
						>
							{designs.map(({ value, label }) => (
								<button
									key={value}
									type="button"
									aria-pressed={design === value}
									onClick={() => onDesignChange(value)}
								>
									{label}
								</button>
							))}
						</fieldset>
						<button
							className="text-button"
							type="button"
							onClick={reset}
						>
							Reset demo
						</button>
					</div>
					<label className="trigger-option">
						<input
							type="checkbox"
							checked={showTrigger}
							onChange={(event) => onTriggerChange(event.target.checked)}
						/>
						Show floating preferences trigger
					</label>
				</section>

				<div className="gallery">
					<section
						className="video-panel"
						aria-labelledby="video-heading"
					>
						<div className="section-heading">
							<h2 id="video-heading">A video, when you allow it</h2>
							<span className="category">Measurement</span>
						</div>
						<Frame
							category="measurement"
							noStyle
							placeholder={
								<div
									className="video-placeholder"
									data-testid="youtube-placeholder"
								>
									<span
										className="play-mark"
										aria-hidden="true"
									>
										▶
									</span>
									<h3>YouTube is waiting for your permission</h3>
									<p>
										Allow measurement in your preferences to load the video.
										Until then, no YouTube iframe is mounted.
									</p>
									<ConsentDialogLink className="preferences-button">
										Review preferences
									</ConsentDialogLink>
								</div>
							}
						>
							{/* oxlint-disable react/iframe-missing-sandbox -- This fixed cross-origin YouTube player needs its own origin for storage and playback. */}
							<iframe
								className="video-frame"
								sandbox="allow-scripts allow-same-origin allow-presentation"
								src="https://www.youtube-nocookie.com/embed/czTksCF6X8Y"
								title="YouTube video"
								allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
								allowFullScreen
							/>
							{/* oxlint-enable react/iframe-missing-sandbox */}
						</Frame>
						<p className="caption">
							Revoking measurement removes the iframe. Requests already sent
							cannot be undone.
						</p>
					</section>
					<section
						className="integrations-panel"
						aria-labelledby="integrations-heading"
					>
						<h2 id="integrations-heading">Integration permissions</h2>
						<p>These indicators show permission, not delivery to a vendor.</p>
						<div
							className="integration"
							data-testid="posthog-status"
						>
							<div>
								<h3>PostHog</h3>
								<p>Measurement · loads after consent</p>
							</div>
							<IntegrationStatus
								configured={posthogConfigured}
								allowed={measurementAllowed}
							/>
						</div>
						<div
							className="integration"
							data-testid="x-pixel-status"
						>
							<div>
								<h3>X Pixel</h3>
								<p>Marketing · loads after consent</p>
							</div>
							<IntegrationStatus
								configured={xPixelConfigured}
								allowed={marketingAllowed}
							/>
						</div>
						<p className="caption">
							Open c15t DevTools in the corner to inspect consent state and
							script activity.
						</p>
					</section>
				</div>
			</main>
			<footer className="site-footer">
				<p>Your preferences are available whenever you need them.</p>
				<ConsentDialogLink>Privacy settings</ConsentDialogLink>
			</footer>
		</div>
	);
};
