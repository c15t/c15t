'use client';

/**
 * Client root for the Next.js adapter.
 *
 * Receives the visitor's `ConsentState` from a Server Component and forwards
 * it to the React provider as `options.prefetch`. Kernel creation,
 * persistence, init, and module wiring live in `@c15t/react`.
 */
import { preloadScriptLoaderWith } from '@c15t/core/runtime/script-loader-preload';
import { resolveStreamedInit } from '@c15t/core/runtime/streamed-init';
import userConfig from '@c15t/nextjs/user-config';
import { ConsentProvider } from '@c15t/react/provider';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { createClientMode } from './client-mode';
import type { ConsentConfig } from './config';
import { readBackendURLFromEnv } from './config';
import type { ConsentClientOptions, ConsentState } from './types';

export interface ConsentRootProps extends ConsentClientOptions {
	/**
	 * The visitor's resolved consent state, produced server-side by
	 * `resolveConsent()` from `c15t/next/server` or `withConsentProps()`
	 * from `c15t/next/pages`. Serializable JSON; a promise is fine, the
	 * provider awaits it. Without it the browser resolves consent itself.
	 */
	state?: ConsentState | Promise<ConsentState>;

	/**
	 * The config to use instead of `c15t.config.ts`. Only for a root the
	 * file can't reach, such as one in a test or a package: a Server
	 * Component can't pass it, because it may hold functions.
	 */
	config?: ConsentConfig;

	children?: ReactNode;
}

/**
 * Bundlers replace `process.env.NODE_ENV` at build time, so production
 * bundles drop the warning behind it.
 */
declare const process: { env: { NODE_ENV?: string } };

let warnedMissingConfig = false;

const warnMissingConfig = function warnMissingConfig(): void {
	if (warnedMissingConfig) {
		return;
	}
	warnedMissingConfig = true;
	console.warn(
		'[c15t] ConsentRoot found no config. Export `defineConsentConfig()` as the default export of c15t.config.ts at the project root and wrap next.config.ts in `withConsentManifest()`, or pass `config`.'
	);
};

/**
 * The transport for the config's mode, or for `options.mode`. Without a
 * backend URL and a mode that brings its own, the root runs offline.
 */
const createMode = function createMode(
	config: ConsentConfig | undefined,
	options: ConsentClientOptions['options']
) {
	return createClientMode(options?.mode ?? config?.mode, {
		backendURL: config ? config.backendURL : readBackendURLFromEnv(),
		routePrefix: config?.routePrefix,
	});
};

type RootOptions = ConsentClientOptions['options'];

/**
 * `options` from props over the config's, one key at a time, and
 * `callbacks` one callback at a time, so `options={{ nonce }}` keeps the
 * config's callbacks and other options.
 */
const mergeOptions = function mergeOptions(
	config: RootOptions,
	props: RootOptions
): RootOptions {
	if (!(config && props)) {
		return props ?? config;
	}
	return {
		...config,
		...props,
		callbacks: { ...config.callbacks, ...props.callbacks },
	};
};

/**
 * Mounts the consent provider for a Next.js app. Render it once, near the
 * top of the tree. It reads `c15t.config.ts` itself, so a Server Component
 * layout renders it directly with the `state` it resolved.
 *
 * Props win over the config's browser options of the same name. `options`
 * merges one key at a time, and `options.callbacks` one callback at a time.
 *
 * @example
 * ```tsx
 * // app/layout.tsx (Server Component)
 * import { ConsentBanner, ConsentDialog, ConsentRoot } from 'c15t/next';
 * import { resolveConsent } from 'c15t/next/server';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         <ConsentRoot state={resolveConsent()}>
 *           {children}
 *           <ConsentBanner />
 *           <ConsentDialog />
 *         </ConsentRoot>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export const ConsentRoot = (props: ConsentRootProps) => {
	// Read at render, not at module top level: `c15t.config.ts` imports
	// `c15t/next`, so the browser graph has a cycle through this module.
	const config = props.config ?? userConfig;
	if (
		process.env.NODE_ENV !== 'production' &&
		!config &&
		!props.options?.mode
	) {
		warnMissingConfig();
	}
	const {
		children,
		clearOnRevocation,
		networkBlocker,
		options,
		persistence,
		scriptLoader,
		scripts,
		state,
		vendors,
	} = {
		...config,
		...props,
		options: mergeOptions(config?.options, props.options),
	};
	// Initial-only, like the provider's own `mode`. A new one on every
	// render would make each rerender load the runtime's update module.
	const [mode, setMode] = useState(() => createMode(config, options));
	void setMode;

	return (
		<ConsentProvider
			options={{
				...options,
				__debugPkg: '@c15t/nextjs',
				// A returning visitor's state often lets a script run. Start the
				// script loader's download during the first render, not after
				// hydration, a round trip later.
				__preloadScriptLoader: preloadScriptLoaderWith,
				// `state` is often a promise the server streams in. Apply it
				// with code from the first-load chunk: loading that code after
				// hydration would hold the banner back by a round trip.
				__resolveStreamedInit: resolveStreamedInit,
				clearOnRevocation,
				journey: options?.journey ?? config?.journey,
				mode,
				networkBlocker,
				persistence,
				prefetch: state,
				scriptLoader,
				scripts,
				vendors,
			}}
		>
			{children}
		</ConsentProvider>
	);
};
