'use client';

import { createManifestTransport } from '@c15t/core/transports/manifest';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentRoot,
	custom,
} from '@c15t/nextjs';
import type { ConsentRootProps } from '@c15t/nextjs';
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
	 * Server-resolved consent state from `resolveConsent()`. Omitted on
	 * routes that init in the browser.
	 */
	state?: ConsentRootProps['state'];
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
			// Selection comes from the `config` prop on the root.
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
 * v3 pattern: one `ConsentRoot`, hosted mode via `backendURL`, and the
 * server state (when any) passed as a plain prop.
 */
export const ConsentShell = ({
	children,
	scenario,
	state,
	backendURL = COMPAT_BACKEND_URL,
	transport = 'hosted',
	manifest,
}: ConsentShellProps) => {
	const mode = useMemo(
		() => createMode({ backendURL, manifest, transport }),
		[backendURL, manifest, transport]
	);

	return (
		<ConsentRoot
			backendURL={transport === 'hosted' ? backendURL : undefined}
			config={transport === 'manifest-geo' ? COMPAT_CONSENT_CONFIG : undefined}
			state={state ?? {}}
			options={{
				callbacks: {
					onChoiceRecorded() {
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
		</ConsentRoot>
	);
};
