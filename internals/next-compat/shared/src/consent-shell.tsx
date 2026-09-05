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

import { COMPAT_BACKEND_URL, COMPAT_MANIFEST_URL } from './config';
import { CompatProbe, getCompatCounters } from './probe';

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
	 * browser from the same-origin manifest route and never calls `/init`.
	 */
	transport?: 'hosted' | 'manifest';
}

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
}: ConsentShellProps) => {
	const mode = useMemo(
		() =>
			transport === 'manifest'
				? custom(
						createManifestTransport({
							backendURL,
							manifestURL: COMPAT_MANIFEST_URL,
						})
					)
				: undefined,
		[backendURL, transport]
	);

	return (
		<ConsentBoundary
			backendURL={transport === 'hosted' ? backendURL : undefined}
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
