/** A promise plus the functions that settle it. */
export interface Deferred<Value> {
	promise: Promise<Value>;
	resolve: (value: Value) => void;
	reject: (reason: unknown) => void;
}

/**
 * Create a promise that something else settles later, such as a kernel
 * event. `Promise.withResolvers` where the browser has it.
 *
 * @returns The deferred.
 */
export const createDeferred = function createDeferred<
	Value,
>(): Deferred<Value> {
	const { withResolvers } = Promise as PromiseConstructor & {
		withResolvers?: <Resolved>() => Deferred<Resolved>;
	};
	if (typeof withResolvers === 'function') {
		return withResolvers.call(Promise) as Deferred<Value>;
	}
	let resolveFn: (value: Value) => void = () => {
		/* replaced below */
	};
	let rejectFn: (reason: unknown) => void = () => {
		/* replaced below */
	};
	// oxlint-disable-next-line promise/avoid-new -- The one place a settle-later promise is built; older Safari lacks withResolvers.
	const promise = new Promise<Value>((resolve, reject) => {
		resolveFn = resolve;
		rejectFn = reject;
	});
	return { promise, reject: rejectFn, resolve: resolveFn };
};
