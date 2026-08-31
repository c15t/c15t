import type { IdentifyUserRequestBody } from '../client-interface';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

/**
 * Helper function to introduce a delay
 * @param ms - Delay duration in milliseconds
 * @returns Promise resolving after the delay
 * @internal
 */
export const delay = (ms: number): Promise<void> =>
	createDeferredPromise((resolve) => setTimeout(resolve, ms));

/**
 * Resolves the subject identifier used by identify-user requests.
 * Supports the canonical `subjectId` field and the deprecated `id` alias.
 */
export const getIdentifySubjectId = function getIdentifySubjectId(
	submission?: IdentifyUserRequestBody
): string | undefined {
	return submission?.subjectId || submission?.id;
};

/**
 * Generates a UUID v4 for request identification
 *
 * @returns A randomly generated UUID string
 */
export const generateUUID = function generateUUID(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/gu, (c) => {
		// oxlint-disable-next-line no-bitwise -- Bitwise arithmetic is required by the wire or hash compatibility algorithm.
		const r = (Math.random() * 16) | 0;
		// oxlint-disable-next-line no-bitwise -- Bitwise arithmetic is required by the wire or hash compatibility algorithm.
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
};
