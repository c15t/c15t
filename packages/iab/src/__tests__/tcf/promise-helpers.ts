type DeferredPromise<Value> = {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
};

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers<Value>(): DeferredPromise<Value>;
};

export function createCallbackPromise<Value>(
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
}

export async function waitForTimeout(milliseconds: number): Promise<void> {
	await createCallbackPromise<void>((resolve) => {
		setTimeout(resolve, milliseconds);
	});
}
