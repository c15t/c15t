import type { InitContext } from '../types';

/** Acquire a fresh browser receipt outside the consent initialization path. @internal */
export const createObservationReceiptAcquirer =
	function createObservationReceiptAcquirer(options: {
		acceptsEndpoint: (endpoint: string) => boolean;
		load: (context: InitContext, signal: AbortSignal) => Promise<unknown>;
		accept: (payload: unknown, journey: InitContext['journey']) => void;
	}) {
		let cleanup: (() => void) | undefined;
		let generation = 0;
		let currentKey: string | undefined;
		const dispose = () => {
			generation += 1;
			cleanup?.();
			cleanup = undefined;
			currentKey = undefined;
		};
		return {
			begin(context: InitContext, endpoint: string) {
				if (
					typeof document === 'undefined' ||
					!context.journey ||
					!options.acceptsEndpoint(endpoint)
				) {
					return;
				}
				const key = JSON.stringify([
					endpoint,
					context.journey,
					context.overrides,
				]);
				if (currentKey === key) {
					return;
				}
				dispose();
				currentKey = key;
				const epoch = generation;
				let attempts = 0;
				let pending = false;
				let complete = false;
				let controller: AbortController | undefined;
				let timeout: ReturnType<typeof setTimeout> | undefined;
				let stop = () => {
					/* Assigned before the first request. */
				};
				const request = () => {
					if (
						epoch !== generation ||
						pending ||
						complete ||
						attempts >= 3 ||
						document.visibilityState !== 'visible'
					) {
						return;
					}
					attempts += 1;
					pending = true;
					const attemptController = new AbortController();
					controller = attemptController;
					timeout = setTimeout(() => attemptController.abort(), 5_000);
					void (async () => {
						try {
							const payload = await options.load(
								context,
								attemptController.signal
							);
							if (epoch !== generation || attemptController.signal.aborted) {
								return;
							}
							complete = true;
							options.accept(payload, context.journey);
							stop();
						} catch {
							// Offline or unavailable observations do not change consent state.
						} finally {
							if (timeout) {
								clearTimeout(timeout);
							}
							pending = false;
						}
					})();
				};
				stop = () => {
					document.removeEventListener('visibilitychange', request);
					window.removeEventListener('online', request);
					if (timeout) {
						clearTimeout(timeout);
					}
					controller?.abort();
				};
				cleanup = stop;
				document.addEventListener('visibilitychange', request);
				window.addEventListener('online', request);
				request();
			},
			dispose,
		};
	};
