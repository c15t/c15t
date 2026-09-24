import type { InitOutput } from '@c15t/schema/types';

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Create an ephemeral identifier only for an actual browser init request. */
export function createConsentVisitId(): string | undefined {
	try {
		return typeof window !== 'undefined' &&
			typeof globalThis.crypto?.randomUUID === 'function'
			? crypto.randomUUID()
			: undefined;
	} catch {
		return undefined;
	}
}

/** Correlates existing init/save requests without creating network requests. */
export function createConsentVisitTracker() {
	let visitId: string | undefined;
	let disposed = false;

	return {
		getVisitId: () => (disposed ? undefined : visitId),
		dispose: () => {
			disposed = true;
			visitId = undefined;
		},
		/** Accept only the backend echo of this init request's expected ID. */
		initialise: (data: InitOutput | undefined, expectedId?: string) => {
			visitId =
				!disposed &&
				expectedId &&
				UUID_PATTERN.test(expectedId) &&
				data?.visitTracking?.enabled === true &&
				data.visitTracking.visitId === expectedId
					? expectedId
					: undefined;
		},
	};
}

export type ConsentVisitTracker = ReturnType<typeof createConsentVisitTracker>;
