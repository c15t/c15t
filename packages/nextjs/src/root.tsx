'use client';

/**
 * Client root for the Next.js adapter.
 *
 * Receives the visitor's `ConsentState` from a Server Component and forwards
 * it to the React provider as `options.prefetch`. Kernel creation,
 * persistence, init, and module wiring live in `@c15t/react`.
 */
import { preloadScriptLoaderWith } from '@c15t/core/runtime/script-loader-preload';
import type * as ScriptServerStart from '@c15t/core/runtime/script-server-start';
import { resolveStreamedInit } from '@c15t/core/runtime/streamed-init';
import userConfig from '@c15t/nextjs/user-config';
import { ConsentProvider } from '@c15t/react/provider';
import type { ConsentProviderOptions } from '@c15t/react/provider';
import * as React from 'react';
import { Suspense, useState } from 'react';
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
 * The transport for the config's mode, or for `options.mode`.
 *
 * @throws {Error} When the mode needs a backend URL and neither the config
 * nor `NEXT_PUBLIC_C15T_BACKEND_URL` (or `NEXT_PUBLIC_INTH_PROJECT_URL`)
 * sets one.
 */
const createMode = function createMode(
	config: ConsentConfig | undefined,
	options: ConsentClientOptions['options']
) {
	// The config carries the backend URL, route prefix and `proxy`.
	return createClientMode(
		options?.mode ?? config?.mode,
		config ?? { backendURL: readBackendURLFromEnv() }
	);
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

type ScriptServerStartModule = typeof ScriptServerStart;

let scriptServerStartModule:
	| Promise<ScriptServerStartModule | undefined>
	| undefined;

/**
 * Loaded on the server only, so no browser chunk requests it. A failed
 * import skips the server start and lets the next render retry.
 */
const importScriptServerStart = function importScriptServerStart(): Promise<
	ScriptServerStartModule | undefined
> {
	scriptServerStartModule ??= (async () => {
		try {
			return await import('@c15t/core/runtime/script-server-start');
		} catch {
			scriptServerStartModule = undefined;
			return undefined;
		}
	})();
	return scriptServerStartModule;
};

const settledStates = new WeakMap<
	Promise<ConsentState>,
	Promise<ConsentState | undefined>
>();

/**
 * `state` with a rejection as `undefined`: the provider falls back to its
 * transport then, and the server start has nothing to start. One promise
 * per input, so `use` sees the same value on a retry.
 */
const settledState = function settledState(
	state: Promise<ConsentState>
): Promise<ConsentState | undefined> {
	let settled = settledStates.get(state);
	if (!settled) {
		settled = (async () => {
			try {
				return await state;
			} catch {
				return undefined;
			}
		})();
		settledStates.set(state, settled);
	}
	return settled;
};

/** React 19's `use`, absent from the React 18 a Pages Router app may run. */
const { use } = React as {
	use?: <Value>(value: Promise<Value>) => Value;
};

/**
 * Starts the scripts the server's consent state already lets run. An
 * inline script runs the setup of each one with a `serverStart` and
 * inserts it before hydration, and the loader adopts it. In the browser
 * it only hydrates the inline script.
 *
 * Neither the vendor scripts nor the loader's chunk get a
 * `<link rel="preload">`. On a throttled mobile profile, vendor preloads
 * delayed the page's own chunks and hydration by about 100 ms, and a
 * preload of the loader's chunk delayed first paint by about 36 ms. The
 * vendor scripts gained under 200 ms, and the loader's chunk 9 ms.
 *
 * It suspends on a streamed state inside its own boundary, so the rest of
 * the page streams without it. `resolveConsent()` marks the render
 * request-time, so the inline script never lands in prerendered HTML.
 */
const ServerScriptStart = ({
	options,
}: {
	options: ConsentProviderOptions;
}): ReactNode => {
	if (!use) {
		return null;
	}
	if (typeof document !== 'undefined') {
		// Hydrates the server's start script without running or replacing it.
		return (
			<script
				// oxlint-disable-next-line react/no-danger -- Empty: keeps the server's script.
				dangerouslySetInnerHTML={{ __html: '' }}
				suppressHydrationWarning
			/>
		);
	}
	const { prefetch } = options;
	const state =
		typeof (prefetch as PromiseLike<unknown> | undefined)?.then === 'function'
			? use(settledState(prefetch as Promise<ConsentState>))
			: (prefetch as ConsentState | undefined);
	const module = use(importScriptServerStart());
	// A failed import still renders the empty script the browser hydrates.
	const code = module?.serverScriptStart({
		...(options as unknown as Parameters<
			ScriptServerStartModule['serverScriptStart']
		>[0]),
		prefetch: state,
	});
	return (
		// Runs a granted vendor's setup and inserts its tag before the page
		// hydrates. The script loader adopts the tag.
		<script
			// oxlint-disable-next-line react/no-danger -- c15t's own code; serverScriptStart escapes `<` in every value.
			dangerouslySetInnerHTML={{ __html: code ?? '' }}
			nonce={options.nonce}
			suppressHydrationWarning
		/>
	);
};

/**
 * Mounts the consent provider for a Next.js app. Render it once, near the
 * top of the tree. It reads `c15t.config.ts` itself, so a Server Component
 * layout renders it directly with the `state` it resolved.
 *
 * Props win over the config's browser options of the same name. `options`
 * merges one key at a time, and `options.callbacks` one callback at a time.
 *
 * @throws {Error} When `manifest()` or `hosted()` has no backend URL: no
 * `c15t.config.ts` sets one and neither `NEXT_PUBLIC_C15T_BACKEND_URL` nor
 * `NEXT_PUBLIC_INTH_PROJECT_URL` is set.
 * `offline()` needs none.
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

	const providerOptions: ConsentProviderOptions = {
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
	};

	return (
		<ConsentProvider options={providerOptions}>
			{children}
			{/* After the page: an inline script waits for the stylesheets,
			so ahead of the content it would hold back first paint. */}
			{scripts?.length ? (
				<Suspense fallback={null}>
					<ServerScriptStart options={providerOptions} />
				</Suspense>
			) : null}
		</ConsentProvider>
	);
};
