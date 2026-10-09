'use client';

/**
 * `@c15t/react/gpp` — IAB GPP for a React consent provider.
 *
 * A separate entry, like `@c15t/react/iab`, so apps that do not render
 * {@link ConsentGPP} bundle none of the GPP code.
 *
 * @packageDocumentation
 */

import type { AllConsentNames } from '@c15t/core';
import type { RuntimeGPPOptions } from '@c15t/core/runtime';
import { createGPP } from '@c15t/iab/gpp';
import { useContext, useEffect } from 'react';

import { KernelContext } from './context';

/** Props for {@link ConsentGPP}: the GPP options, all optional. */
export type ConsentGPPProps = RuntimeGPPOptions;

/**
 * Installs `window.__gpp`, the IAB GPP CMP API, on the surrounding
 * provider's kernel and keeps its GPP string in step with the visitor's
 * choices. Renders nothing. Unmounting removes `__gpp`.
 *
 * Render it inside `ConsentProvider` (or `ConsentRoot` in Next.js and
 * TanStack Start). Every prop is plain data, so a Server Component can
 * render it.
 *
 * @param props - GPP options. See `RuntimeGPPOptions`.
 * @returns `null`.
 * @throws {Error} When rendered outside a consent provider.
 *
 * @example
 * ```tsx
 * import { ConsentGPP } from '@c15t/react/gpp';
 *
 * <ConsentProvider options={{ mode: hosted({ backendURL }) }}>
 *   <ConsentGPP usFallback="none" />
 *   <App />
 * </ConsentProvider>
 * ```
 */
export const ConsentGPP = ({
	cmpId,
	mspaMode,
	optOutCategories,
	tcf,
	usApproach,
	usFallback,
}: ConsentGPPProps): null => {
	const kernel = useContext(KernelContext);
	if (!kernel) {
		throw new Error(
			'c15t: ConsentGPP must be rendered inside <ConsentProvider> from @c15t/react.'
		);
	}
	// A key, so an inline array does not remount the API on every render.
	const categories = optOutCategories?.join(',');

	useEffect(() => {
		let handle: ReturnType<typeof createGPP> | null = null;
		try {
			handle = createGPP({
				cmpId,
				kernel,
				mspaMode,
				optOutCategories: categories?.split(',') as
					| AllConsentNames[]
					| undefined,
				tcf,
				usApproach,
				usFallback,
			});
		} catch (error) {
			// Another CMP owns `__gpp`; consent keeps working without it.
			// oxlint-disable-next-line no-console -- Integration diagnostic.
			console.error('c15t: GPP was not installed.', error);
		}
		return () => handle?.dispose();
	}, [categories, cmpId, kernel, mspaMode, tcf, usApproach, usFallback]);

	return null;
};
