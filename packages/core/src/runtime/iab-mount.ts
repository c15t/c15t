/**
 * Mounting the IAB CMP for a runtime: wait until the kernel knows a
 * `cmpId` (from options or a hosted `/init`), then create the CMP with the
 * publisher's options. A runtime mounts it through the `mountIAB` module,
 * so a host that never configures IAB through the runtime ships none of
 * this.
 */
import type { ConsentKernel } from '../types';
import type {
	ConsentRuntimeIABFactory,
	ConsentRuntimeIABFactoryOptions,
	ConsentRuntimeIABHandle,
	RuntimeIABOptions,
} from './types';

/** Options for {@link mountRuntimeIAB}. */
export interface RuntimeIABMountOptions {
	/** `createIAB` from `@c15t/iab`, or a lazy factory around it. */
	createIAB: ConsentRuntimeIABFactory;
	/** The runtime's `iab` option. */
	iab: Exclude<RuntimeIABOptions, false>;
	kernel: ConsentKernel;
	/** Called with the mounted handle, and with `null` once it is disposed. */
	onHandle: (handle: ConsentRuntimeIABHandle | null) => void;
}

const normalizeIABOptions = function normalizeIABOptions(
	kernel: ConsentKernel,
	iab: RuntimeIABOptions | undefined
): Omit<ConsentRuntimeIABFactoryOptions, 'kernel'> | null {
	if (iab === false || !iab || iab.enabled === false) {
		return null;
	}
	const currentIab = kernel.getSnapshot().iab;
	const cmpId = iab.cmpId ?? currentIab?.cmpId;
	if (typeof cmpId !== 'number') {
		return null;
	}
	return {
		cmpId,
		cmpVersion:
			typeof iab.cmpVersion === 'string'
				? Number(iab.cmpVersion)
				: iab.cmpVersion,
		customVendors: iab.customVendors ?? currentIab?.customVendors,
		gvl: iab.gvl ?? currentIab?.gvl ?? undefined,
		gvlURL: iab.gvlURL,
		isServiceSpecific: iab.isServiceSpecific,
		publisherCountryCode: iab.publisherCountryCode,
		publisherRestrictions: iab.publisherRestrictions,
		vendors: iab.vendors,
	};
};

/**
 * Mount the IAB CMP once the kernel carries enough to configure it.
 *
 * @param options - See {@link RuntimeIABMountOptions}.
 * @returns Stops watching and disposes the CMP.
 */
export const mountRuntimeIAB = function mountRuntimeIAB({
	createIAB,
	iab,
	kernel,
	onHandle,
}: RuntimeIABMountOptions): () => void {
	let handle: ConsentRuntimeIABHandle | null = null;
	const mountWhenReady = function mountWhenReady() {
		if (handle) {
			return;
		}
		const iabOptions = normalizeIABOptions(kernel, iab);
		if (iabOptions) {
			handle = createIAB({ ...iabOptions, kernel });
			onHandle(handle);
		}
	};
	mountWhenReady();
	// A hosted backend can return `cmpId` and the GVL from `/init`, so keep
	// watching until the snapshot carries enough to mount.
	const unsubscribe = kernel.subscribe(mountWhenReady);
	return () => {
		unsubscribe();
		if (handle) {
			handle.dispose();
			handle = null;
			onHandle(null);
		}
	};
};
