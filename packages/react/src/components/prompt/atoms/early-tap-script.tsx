'use client';

import {
	EARLY_CONSENT_TAP_SCRIPT,
	replayEarlyConsentTaps,
} from '@c15t/core/surface-actions';
import {
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';

import { ProviderServicesContext } from '~/context';
import {
	toSaveUISource,
	useConsentTracking,
} from '~/context/consent-tracking-context';
import { useCommittedRef } from '~/hooks/use-committed-ref';
import { useIsHydrated } from '~/hooks/use-is-hydrated';
import { useKernel } from '~/kernel-selector';
import { useUIConfig } from '~/ui-config-context';

/** A layout effect in the browser; nothing to run on the server. */
const useBrowserLayoutEffect =
	typeof document === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Keeps a banner tap made before hydration.
 *
 * A server-rendered banner shows long before React attaches its handlers.
 * The inline script records an accept, reject, dismiss or customize tap in
 * that gap and hides the banner. Once this component mounts, the banner's
 * own handlers work: it stops the script and records the tap when the
 * runtime has started. See `@c15t/core/surface-actions`.
 *
 * The script is in the server HTML. A banner that hydrates keeps it, inert
 * once claimed, so hydration changes nothing in the markup. A banner React
 * renders in the browser has its handlers at once, and a script it inserts
 * would never run, so there it renders nothing.
 *
 * @internal
 */
export const EarlyTapScript = () => {
	const { nonce } = useUIConfig();
	const hydrated = useIsHydrated();
	// Decided by the first render: hydration keeps the server's script.
	// oxlint-disable-next-line react/hook-use-state -- Read once, at mount.
	const [serverRendered] = useState(!hydrated);
	const kernel = useKernel();
	// The banner root's source, which its buttons record once hydrated.
	const uiSource = toSaveUISource(useConsentTracking().uiSource);
	const services = useCommittedRef(useContext(ProviderServicesContext));
	const script = useRef<HTMLScriptElement>(null);
	// The script ran in the window of the document it was parsed into,
	// which is not this bundle's `window` when the tree renders into a frame.
	const view = useRef<Window | null>(null);
	useBrowserLayoutEffect(() => {
		view.current = script.current?.ownerDocument.defaultView ?? null;
	}, []);
	useEffect(
		() =>
			replayEarlyConsentTaps(kernel, {
				categories: () => services.current?.getConsentCategories(),
				started: () => services.current?.isStarted() ?? true,
				uiSource,
				view: view.current,
			}),
		[kernel, services, uiSource]
	);
	if (!serverRendered) {
		return null;
	}
	return (
		<script
			ref={script}
			nonce={nonce}
			// oxlint-disable-next-line react/no-danger -- c15t's own build-time script.
			dangerouslySetInnerHTML={{ __html: EARLY_CONSENT_TAP_SCRIPT }}
		/>
	);
};
