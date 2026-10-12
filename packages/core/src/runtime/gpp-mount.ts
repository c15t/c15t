/**
 * Mounting the IAB GPP CMP API for a runtime: load `@c15t/iab/gpp` through
 * the host's loader, then mount it on the kernel. The loader keeps the GPP
 * code out of every page that does not turn GPP on.
 */
import type { ConsentKernel } from '../types';
import type {
	ConsentRuntimeGPPHandle,
	GPPModuleLoader,
	RuntimeGPPOptions,
} from './types';

/** Options for {@link mountRuntimeGPP}. */
export interface RuntimeGPPMountOptions {
	/** The runtime's `gpp` option, when it turns GPP on. */
	gpp: RuntimeGPPOptions | true;
	kernel: ConsentKernel;
	/** Resolves the module exporting `createGPP`. */
	loadGPP: GPPModuleLoader;
	/** Called with a load or mount error, such as another CMP owning `__gpp`. */
	onError: (error: unknown) => void;
}

/**
 * Load and mount the GPP CMP API.
 *
 * @param options - See {@link RuntimeGPPMountOptions}.
 * @returns Removes `__gpp`, or stops a load still in flight from mounting.
 */
export const mountRuntimeGPP = function mountRuntimeGPP({
	gpp,
	kernel,
	loadGPP,
	onError,
}: RuntimeGPPMountOptions): () => void {
	let stopped = false;
	let handle: ConsentRuntimeGPPHandle | null = null;
	const mount = async function mount(): Promise<void> {
		try {
			const { createGPP } = await loadGPP();
			if (!stopped) {
				handle = createGPP(gpp === true ? { kernel } : { ...gpp, kernel });
			}
		} catch (error) {
			// GPP stays unmounted; consent keeps working.
			onError(error);
		}
	};
	void mount();
	return function unmountGPP() {
		stopped = true;
		handle?.dispose();
		handle = null;
	};
};
