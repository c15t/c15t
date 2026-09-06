'use client';

import { createManifestTransport } from '@c15t/core/transports/manifest';
import {
	ConsentBanner,
	ConsentBoundary,
	ConsentDialog,
	custom,
} from '@c15t/nextjs';
import type { ConsentBoundaryProps } from '@c15t/nextjs';
import { useMemo } from 'react';
import type { ReactNode } from 'react';

import {
	COMPAT_BACKEND_URL,
	COMPAT_CONSENT_CONFIG,
	COMPAT_MANIFEST_URL,
} from './config';
import { CompatProbe, getCompatCounters } from './probe';
import { createStaticTransport } from './static-transport';
import type { CompatManifest } from './static-transport';

export interface ConsentShellProps {
	children?: ReactNode;
	scenario: string;
	/**
	 * Server-derived kernel config from `readInitialConsentConfig()` or
	 * `prefetchInitialConsent()`. Omitted on routes that init in the browser.
	 */
	config?: ConsentBoundaryProps['config'];
	backendURL?: string;
	/**
	 * `hosted` calls the backend `/init`; `manifest` resolves init in the
	 * browser from the same-origin manifest route and never calls `/init`;
	 * `static` resolves init from the `manifest` prop, a module generated at
	 * build time for `output: 'export'` apps, and fetches nothing.
	 */
	transport?: 'hosted' | 'manifest' | 'manifest-geo' | 'static';
	/** Required with `transport="static"`. */
	manifest?: CompatManifest;
}

const createMode = function createMode({
	backendURL,
	manifest,
	transport,
}: Required<Pick<ConsentShellProps, 'backendURL' | 'transport'>> &
	Pick<ConsentShellProps, 'manifest'>) {
	switch (transport) {
		case 'manifest-geo': {
			// Selection comes from the `consent` config on the boundary.
			return undefined;
		}
		case 'manifest': {
			return custom(
				createManifestTransport({
					backendURL,
					manifestURL: COMPAT_MANIFEST_URL,
				})
			);
		}
		case 'static': {
			if (!manifest) {
				throw new Error('ConsentShell: transport="static" needs a manifest');
			}
			return custom(createStaticTransport({ backendURL, manifest }));
		}
		default: {
			return undefined;
		}
	}
};

/**
 * The client-side provider tree every fixture route mounts.
 *
 * @remarks
 * Kept identical across routers and Next.js versions so a failing cell
 * points at the framework combination, not at fixture drift. Mirrors the
 * v3 pattern: one `ConsentBoundary`, hosted mode via `backendURL`, and the
 * server config (when any) passed as a plain prop.
 */
export const ConsentShell = ({
	children,
	scenario,
	config,
	backendURL = COMPAT_BACKEND_URL,
	transport = 'hosted',
	manifest,
}: ConsentShellProps) => {
	const mode = useMemo(
		() => createMode({ backendURL, manifest, transport }),
		[backendURL, manifest, transport]
	);

	return (
		<ConsentBoundary
			backendURL={transport === 'hosted' ? backendURL : undefined}
			consent={transport === 'manifest-geo' ? COMPAT_CONSENT_CONFIG : undefined}
			config={config ?? {}}
			options={{
				callbacks: {
					onBannerFetched() {
						const counters = getCompatCounters();
						if (counters) {
							counters.onBannerFetchedCount += 1;
						}
					},
					onConsentSet() {
						const counters = getCompatCounters();
						if (counters) {
							counters.onConsentSetCount += 1;
						}
					},
					onError() {
						const counters = getCompatCounters();
						if (counters) {
							counters.onErrorCount += 1;
						}
					},
				},
				consentCategories: ['necessary', 'measurement', 'marketing'],
				mode,
				theme: {
					motion: {
						duration: { fast: '1ms', normal: '1ms', slow: '1ms' },
					},
				},
			}}
		>
			<CompatProbe scenario={scenario} />
			<ConsentBanner disableAnimation />
			<ConsentDialog disableAnimation />
			<main
				data-scenario={scenario}
				data-testid="compat-main"
			>
				<h1>next-compat: {scenario}</h1>
				{children}
			</main>
		</ConsentBoundary>
	);
};
