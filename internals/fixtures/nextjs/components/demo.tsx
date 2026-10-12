'use client';

import { ConsentDialogTrigger, useConsent } from 'c15t/next';
import { ConsentDevTools } from 'c15t/next/devtools';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { VideoEmbed } from '@/components/video-embed';

const routes = [
	{ href: '/app-router', label: 'App Router' },
	{ href: '/awaited', label: 'Awaited' },
	{ href: '/pages-router', label: 'Pages Router' },
	{ href: '/client-init', label: 'Browser init' },
	{ href: '/experiment', label: 'Experiment' },
];

const designs = [
	{ href: '/app-router', label: 'Default design' },
	{ href: '/branded', label: 'Branded design' },
];

const IntegrationStatus = ({ allowed }: { allowed: boolean }) => (
	<span
		className="status"
		data-allowed={allowed}
	>
		{allowed ? 'Allowed' : 'Blocked'}
	</span>
);

/**
 * Demo gallery rendered by every example route inside that route's
 * `Consent` wrapper. It owns only demo controls. The consent setup lives in
 * the root layouts, `components/consent.tsx` and `pages/_app.tsx`.
 */
export const Demo = ({ children }: { children: ReactNode }) => {
	const measurementAllowed = useConsent('measurement');
	const marketingAllowed = useConsent('marketing');
	const pathname = usePathname();
	const [showTrigger, setShowTrigger] = useState(false);

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
					{routes.map(({ href, label }) => (
						<Link
							key={href}
							href={href}
							aria-current={pathname === href ? 'page' : undefined}
						>
							{label}
						</Link>
					))}
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
					<p className="route-note">{children}</p>
				</section>

				<section
					className="design-panel"
					aria-labelledby="design-heading"
				>
					<div>
						<h2 id="design-heading">Compare banner designs</h2>
						<p>The same policy and actions, with different presentation.</p>
					</div>
					<div className="design-controls">
						<nav
							className="design-links"
							aria-label="Banner design"
						>
							{designs.map(({ href, label }) => (
								<a
									key={href}
									href={href}
									aria-current={pathname === href ? 'page' : undefined}
								>
									{label}
								</a>
							))}
						</nav>
					</div>
					<label className="trigger-option">
						<input
							type="checkbox"
							checked={showTrigger}
							onChange={(event) => setShowTrigger(event.target.checked)}
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
						<VideoEmbed />
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
							<IntegrationStatus allowed={measurementAllowed} />
						</div>
						<div
							className="integration"
							data-testid="x-pixel-status"
						>
							<div>
								<h3>X Pixel</h3>
								<p>Marketing · loads after consent</p>
							</div>
							<IntegrationStatus allowed={marketingAllowed} />
						</div>
						<p className="caption">
							Open c15t DevTools in the corner to inspect consent state and
							script activity, or to clear stored records.
						</p>
					</section>
				</div>
			</main>
			{showTrigger && <ConsentDialogTrigger />}
			<ConsentDevTools position="bottom-right" />
		</div>
	);
};
