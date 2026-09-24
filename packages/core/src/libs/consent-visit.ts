import type { InitOutput } from '@c15t/schema/types';
import type { ConsentManagerInterface } from '../client/client-interface';
import type { ConsentStoreState } from '../store/type';

type VisitState = 'choice_required' | 'existing_choice' | 'not_required';
type VisitEvent = 'started' | 'state' | 'activity' | 'ended';

/** An ephemeral browser visit, enabled only by the configured hosted backend. */
export function createConsentVisitTracker(
	manager: Pick<ConsentManagerInterface, '$fetch'>
) {
	let visitId: string | undefined;
	let state: VisitState | undefined;
	let policyId: string | undefined;
	let active = false;
	let disposed = false;
	let timer: ReturnType<typeof setInterval> | undefined;
	let suspended = false;

	function send(event: VisitEvent) {
		if (!active || !visitId || disposed) return;
		try {
			void manager
				.$fetch('/consent/visits', {
					method: 'POST',
					body: {
						version: 1,
						visitId,
						eventId: crypto.randomUUID(),
						event,
						state,
						policyId,
						domain: window.location.hostname,
					},
					fetchOptions: {
						mode: 'cors',
						credentials: 'omit',
						keepalive: true,
						referrerPolicy: 'no-referrer',
					},
					retryConfig: { maxRetries: 0 },
				})
				.catch(() => {});
		} catch {
			// Optional analytics must never interrupt consent or page navigation.
		}
	}

	function stopTimer() {
		if (timer !== undefined) clearInterval(timer);
		timer = undefined;
	}

	function resume() {
		stopTimer();
		if (
			!active ||
			disposed ||
			suspended ||
			document.visibilityState !== 'visible'
		)
			return;
		timer = setInterval(() => send('activity'), 60_000);
	}

	function onVisibilityChange() {
		if (document.visibilityState === 'visible' && !suspended) send('activity');
		resume();
	}

	function stop() {
		active = false;
		suspended = false;
		stopTimer();
		if (typeof window === 'undefined' || typeof document === 'undefined')
			return;
		document.removeEventListener('visibilitychange', onVisibilityChange);
		window.removeEventListener('pagehide', onPageHide);
		window.removeEventListener('pageshow', onPageShow);
	}

	function dispose() {
		stop();
		disposed = true;
	}

	function onPageHide(event: PageTransitionEvent) {
		if (event.persisted) {
			suspended = true;
			stopTimer();
			return;
		}
		send('ended');
		dispose();
	}

	function onPageShow(event: PageTransitionEvent) {
		if (!event.persisted) return;
		suspended = false;
		if (document.visibilityState === 'visible') send('activity');
		resume();
	}

	function start(
		data: InitOutput | undefined,
		current?: Pick<ConsentStoreState, 'activeUI' | 'consentInfo'>,
		hasRestoredChoice = false
	) {
		if (data?.visitTracking?.enabled !== true) {
			stop();
			return;
		}
		if (
			disposed ||
			typeof window === 'undefined' ||
			typeof document === 'undefined' ||
			typeof globalThis.crypto?.randomUUID !== 'function'
		)
			return;
		try {
			const firstStart = !visitId;
			const wasActive = active;
			const needsState = state === undefined && current !== undefined;
			visitId ??= crypto.randomUUID();
			if (needsState) {
				state =
					current.consentInfo || hasRestoredChoice
						? 'existing_choice'
						: current.activeUI === 'none'
							? 'not_required'
							: 'choice_required';
			}
			policyId ??= data.policyDecision?.policyId ?? data.policy?.id;
			active = true;
			if (!wasActive) {
				document.addEventListener('visibilitychange', onVisibilityChange);
				window.addEventListener('pagehide', onPageHide);
				window.addEventListener('pageshow', onPageShow);
				if (firstStart) send('started');
				resume();
			}
			if (needsState || (!wasActive && state)) send('state');
		} catch {
			stop();
		}
	}

	return {
		getVisitId: () => (active && !disposed ? visitId : undefined),
		dispose,
		/** Start an opted-in visit while asynchronous IAB state is unresolved. */
		start: (data: InitOutput) => start(data),
		/** Apply a resolved init result, including SSR and prefetch hydration. */
		initialise: start,
	};
}

export type ConsentVisitTracker = ReturnType<typeof createConsentVisitTracker>;
