'use client';

/**
 * Client boundary for the v3 Next.js adapter.
 *
 * Receives a plain `KernelConfig` from a Server Component and creates
 * the kernel inside `useState(() => ...)`. The kernel lives for the
 * lifetime of this component's mount — never module-level, so Vercel
 * Fluid Compute request reuse cannot leak consent between users.
 *
 * Optionally accepts a `backendURL`. When present, the boundary:
 *   1. Builds a hosted transport and passes it to the kernel.
 *   2. Fires `kernel.commands.init()` inside a `useEffect` on mount.
 *
 * Optionally accepts module props (`scripts`, `networkBlocker`,
 * `blockIframes`, `persistence`) — the boundary wires each corresponding
 * v3 boot module automatically. Consumers who want full control can
 * import the hooks directly from `@c15t/react/v3` instead of passing
 * these props.
 *
 * Each module prop is rendered behind its own child component so React
 * hook order stays stable regardless of which modules are enabled.
 */
import {
	ConsentProvider,
	createConsentKernel,
	createHostedTransport,
	type UseIframeBlockerOptions,
	type UseNetworkBlockerOptions,
	type UsePersistenceOptions,
	useIframeBlocker,
	useNetworkBlocker,
	usePersistence,
	useScriptLoader,
} from '@c15t/react/v3';
import type { KernelConfig, KernelTransport } from 'c15t/v3';
import type { Script } from 'c15t/v3/modules/script-loader';
import { type ReactNode, useEffect, useState } from 'react';

export interface ConsentBoundaryProps {
	/**
	 * Kernel configuration produced server-side by
	 * `readInitialConsentConfig()` or `prefetchInitialConsent()` from
	 * `@c15t/nextjs/v3/server`. Serializable JSON.
	 */
	config: KernelConfig;

	/**
	 * Backend base URL (e.g. `/api/c15t` or `https://consent.example.com`).
	 * When provided, the boundary builds a hosted transport and fires
	 * `kernel.commands.init()` on mount. Omit for pure offline kernels.
	 */
	backendURL?: string;

	/**
	 * Inject an alternative transport. Overrides `backendURL` when both
	 * are provided. Useful for custom authentication wrappers or test
	 * doubles.
	 */
	transport?: KernelTransport;

	/**
	 * Skip the automatic `commands.init()` call on mount.
	 */
	skipAutoInit?: boolean;

	/**
	 * Script tags to manage via the v3 script-loader module.
	 */
	scripts?: Script[];

	/**
	 * Network-blocker configuration.
	 */
	networkBlocker?: UseNetworkBlockerOptions;

	/**
	 * Enable the iframe blocker (observes `data-category` attributes).
	 */
	blockIframes?: boolean | UseIframeBlockerOptions;

	/**
	 * Enable client-side persistence (cookie + localStorage writes).
	 */
	persistence?: boolean | UsePersistenceOptions;

	children: ReactNode;
}

// Each module-child renders nothing but keeps its hook order stable
// for its lifetime. Mounting/unmounting a module child is safe because
// the whole subtree tears down with it.

function ScriptsMount({ scripts }: { scripts: Script[] }) {
	useScriptLoader(scripts);
	return null;
}

function NetworkBlockerMount({
	options,
}: {
	options: UseNetworkBlockerOptions;
}) {
	useNetworkBlocker(options);
	return null;
}

function IframeBlockerMount({
	options,
}: {
	options?: UseIframeBlockerOptions;
}) {
	useIframeBlocker(options);
	return null;
}

function PersistenceMount({ options }: { options?: UsePersistenceOptions }) {
	usePersistence(options);
	return null;
}

export function ConsentBoundary({
	config,
	backendURL,
	transport,
	skipAutoInit = false,
	scripts,
	networkBlocker,
	blockIframes,
	persistence,
	children,
}: ConsentBoundaryProps) {
	const [kernel] = useState(() => {
		const effectiveTransport =
			transport ??
			(backendURL ? createHostedTransport({ backendURL }) : undefined);
		return createConsentKernel({
			...config,
			transport: effectiveTransport,
		});
	});

	useEffect(() => {
		if (skipAutoInit) return;
		if (!backendURL && !transport) return;
		void kernel.commands.init();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<ConsentProvider kernel={kernel}>
			{scripts && scripts.length > 0 ? (
				<ScriptsMount scripts={scripts} />
			) : null}
			{networkBlocker ? <NetworkBlockerMount options={networkBlocker} /> : null}
			{blockIframes ? (
				<IframeBlockerMount
					options={typeof blockIframes === 'object' ? blockIframes : undefined}
				/>
			) : null}
			{persistence ? (
				<PersistenceMount
					options={typeof persistence === 'object' ? persistence : undefined}
				/>
			) : null}
			{children}
		</ConsentProvider>
	);
}
