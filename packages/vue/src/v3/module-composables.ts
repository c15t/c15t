/**
 * Vue composables for c15t/v3 boot modules.
 *
 * Each composable constructs the module in the current component's
 * setup scope and disposes via `onScopeDispose`. Config changes flow
 * through the module's own update methods — modules are never
 * recreated inside a single component mount.
 */
import type { ConsentKernel } from 'c15t/v3';
import {
	createIframeBlocker,
	type IframeBlockerHandle,
} from 'c15t/v3/modules/iframe-blocker';
import {
	type BlockedRequestInfo,
	createNetworkBlocker,
	type NetworkBlockerHandle,
	type NetworkBlockerRule,
} from 'c15t/v3/modules/network-blocker';
import {
	createPersistence,
	type PersistenceHandle,
	type PersistenceOptions,
} from 'c15t/v3/modules/persistence';
import {
	createScriptLoader,
	type Script,
	type ScriptLoaderDebugEvent,
	type ScriptLoaderHandle,
} from 'c15t/v3/modules/script-loader';
import { inject, onScopeDispose, type Ref, watch } from 'vue';
import { kernelInjectionKey } from './context';

function useRequiredKernel(): ConsentKernel {
	const kernel = inject(kernelInjectionKey, null);
	if (!kernel) {
		throw new Error(
			'c15t: no kernel in Vue injection scope. Wrap with <ConsentProvider :kernel="kernel" /> from @c15t/vue/v3.'
		);
	}
	return kernel;
}

/** Optionally unwraps a Vue Ref or accepts a plain value. */
type MaybeRef<T> = T | Ref<T>;

function unwrap<T>(value: MaybeRef<T>): T {
	return (
		value && typeof value === 'object' && 'value' in (value as object)
			? (value as Ref<T>).value
			: (value as T)
	) as T;
}

// -- useScriptLoader --------------------------------------------------------

export interface UseScriptLoaderOptions {
	onDebug?: (event: ScriptLoaderDebugEvent) => void;
}

export function useScriptLoader(
	scripts: MaybeRef<Script[]>,
	options: UseScriptLoaderOptions = {}
): ScriptLoaderHandle {
	const kernel = useRequiredKernel();
	const handle = createScriptLoader({
		kernel,
		scripts: unwrap(scripts),
		onDebug: options.onDebug,
	});

	// Watch for reactive changes if a Ref was supplied.
	if (
		scripts &&
		typeof scripts === 'object' &&
		'value' in (scripts as object)
	) {
		watch(scripts as Ref<Script[]>, (next) => handle.updateScripts(next), {
			deep: true,
		});
	}

	onScopeDispose(() => handle.dispose());
	return handle;
}

// -- useNetworkBlocker ------------------------------------------------------

export interface UseNetworkBlockerOptions {
	rules: MaybeRef<NetworkBlockerRule[]>;
	enabled?: MaybeRef<boolean>;
	logBlockedRequests?: boolean;
	onRequestBlocked?: (info: BlockedRequestInfo) => void;
}

export function useNetworkBlocker(
	options: UseNetworkBlockerOptions
): NetworkBlockerHandle {
	const kernel = useRequiredKernel();
	const handle = createNetworkBlocker({
		kernel,
		rules: unwrap(options.rules),
		enabled:
			options.enabled !== undefined ? unwrap(options.enabled) : undefined,
		logBlockedRequests: options.logBlockedRequests,
		onRequestBlocked: options.onRequestBlocked,
	});

	const rulesRef = options.rules;
	if (
		rulesRef &&
		typeof rulesRef === 'object' &&
		'value' in (rulesRef as object)
	) {
		watch(
			rulesRef as Ref<NetworkBlockerRule[]>,
			(next) => handle.updateRules(next),
			{ deep: true }
		);
	}

	const enabledRef = options.enabled;
	if (
		enabledRef !== undefined &&
		typeof enabledRef === 'object' &&
		'value' in (enabledRef as object)
	) {
		watch(enabledRef as Ref<boolean>, (next) => handle.setEnabled(next));
	}

	onScopeDispose(() => handle.dispose());
	return handle;
}

// -- useIframeBlocker -------------------------------------------------------

export interface UseIframeBlockerOptions {
	disableAutomaticBlocking?: boolean;
}

export function useIframeBlocker(
	options: UseIframeBlockerOptions = {}
): IframeBlockerHandle {
	const kernel = useRequiredKernel();
	const handle = createIframeBlocker({
		kernel,
		disableAutomaticBlocking: options.disableAutomaticBlocking,
	});
	onScopeDispose(() => handle.dispose());
	return handle;
}

// -- usePersistence ---------------------------------------------------------

export interface UsePersistenceOptions
	extends Omit<PersistenceOptions, 'kernel'> {}

export function usePersistence(
	options: UsePersistenceOptions = {}
): PersistenceHandle {
	const kernel = useRequiredKernel();
	// Defer hydration to onMounted so SSR and first client render
	// produce matching snapshots. Same rationale as the React hook.
	const handle = createPersistence({
		kernel,
		storageConfig: options.storageConfig,
		skipHydration: true,
	});
	if (options.skipHydration !== true) {
		// Vue's SSR already waits until mount for client-only storage
		// reads; calling hydrate() here (during setup) is safe on the
		// client and a no-op on the server (storage APIs absent).
		if (typeof document !== 'undefined') {
			// Defer to next tick so the kernel's initial snapshot flows
			// through any reactive subscribers first.
			queueMicrotask(() => handle.hydrate());
		}
	}
	onScopeDispose(() => handle.dispose());
	return handle;
}
