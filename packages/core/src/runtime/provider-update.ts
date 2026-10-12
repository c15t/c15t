/**
 * The part of a provider runtime's `update()` that follows options after
 * mount: identity, configured categories, vendors and the modules whose
 * options changed. `createConsentProviderRuntime` loads it with the first
 * `update()`, so a provider whose options never change ships none of it
 * in its first-load chunk; overrides and `enabled` apply before it loads.
 *
 * It imports no value: everything it calls comes through
 * {@link ProviderUpdateHost.tools}. A module loaded on demand that imported
 * from the first-load chunk would make bundlers split those shared modules
 * into chunks of their own, which costs more than it saves.
 *
 * @internal
 */
import type { extractConsentNamesFromCondition } from '../libs/has';
import type { declareOwnedVendors, resolveVendors } from '../libs/vendors';
import type {
	ClearOnRevocationHandle,
	ClearOnRevocationOptions,
} from '../modules/clear-on-revocation/types';
import type {
	IframeBlockerHandle,
	IframeBlockerOptions,
} from '../modules/iframe-blocker/types';
import type {
	holdNetworkRequests,
	NetworkHold,
} from '../modules/network-blocker/hold';
import type {
	NetworkBlockerHandle,
	NetworkBlockerOptions,
} from '../modules/network-blocker/types';
import type {
	ScriptLoaderHandle,
	ScriptLoaderOptions,
} from '../modules/script-loader/types';
import type { KernelUser } from '../types';
import type { afterModuleLoaded } from './lazy-module';
import type { ModuleSlot } from './provider-runtime';
import type { normalizeKernelUser } from './runtime-kernel';
import type {
	ConsentProviderRuntimeOptions,
	ConsentRuntime,
	ConsentRuntimeUpdate,
} from './types';

/** One of the provider's runtimes and its module slots. */
export interface BuiltProviderRuntime {
	runtime: ConsentRuntime;
	scripts: ModuleSlot<ScriptLoaderOptions, ScriptLoaderHandle>;
	network: ModuleSlot<NetworkBlockerOptions, NetworkBlockerHandle>;
	iframes: ModuleSlot<IframeBlockerOptions, IframeBlockerHandle>;
	cleanup: ModuleSlot<ClearOnRevocationOptions, ClearOnRevocationHandle>;
	/** Tear `dispose` down with this runtime's modules. */
	track: (dispose: () => void) => void;
}

/** The first-load functions the update calls. */
export interface ProviderUpdateTools {
	afterModuleLoaded: typeof afterModuleLoaded;
	declareOwnedVendors: typeof declareOwnedVendors;
	extractConsentNamesFromCondition: typeof extractConsentNamesFromCondition;
	holdNetworkRequests: typeof holdNetworkRequests;
	normalizeKernelUser: typeof normalizeKernelUser;
	notHeld: NetworkHold;
	resolveVendors: typeof resolveVendors;
}

/** What the update needs from the provider runtime. */
export interface ProviderUpdateHost {
	/** The runtime rendered now: the permissive one while disabled. */
	active: () => BuiltProviderRuntime;
	readonly enabled: boolean;
	/** The options the provider was created with. */
	initial: ConsentProviderRuntimeOptions;
	/** The runtime holding the records and policy. */
	main: BuiltProviderRuntime;
	/** The provider's token among the owners of its vendor slugs. */
	ownerSource: symbol;
	tools: ProviderUpdateTools;
}

// This module imports no values (see above), so it repeats the production
// check from `libs/is-production.ts` instead of importing it.
declare const process: { env: { NODE_ENV?: string } };

const isProductionBuild = function isProductionBuild(): boolean {
	try {
		return process.env.NODE_ENV === 'production';
	} catch {
		return false;
	}
};

const warnInDevelopment = function warnInDevelopment(message: string): void {
	if (!isProductionBuild()) {
		console.warn(message);
	}
};

const isPromiseLike = function isPromiseLike<Value>(
	value: Value | PromiseLike<Value> | undefined
): value is PromiseLike<Value> {
	return typeof (value as PromiseLike<Value> | undefined)?.then === 'function';
};

/** The scripts and rules whose slugs declare vendors. */
const ownersOf = function ownersOf(options: ConsentRuntimeUpdate) {
	return [
		...(options.scripts ?? []),
		...(options.networkBlocker ? (options.networkBlocker.rules ?? []) : []),
	];
};

/** Every field `identify()` sends, in a fixed order. */
const userKey = function userKey(user: KernelUser | undefined): string {
	return JSON.stringify(
		user && [
			user.externalId,
			user.externalIdType,
			user.identityProvider,
			user.identityToken,
			user.properties,
		]
	);
};

const vendorsKey = function vendorsKey(options: ConsentRuntimeUpdate): string {
	return JSON.stringify([
		options.vendors ?? [],
		ownersOf(options).map((owner) => [owner.vendor ?? null, owner.category]),
	]);
};

/**
 * The read-once options a warning compares. Storage is among them:
 * persistence reads and writes one location for the runtime's life, and
 * data clearing protects that same location, so neither follows a new
 * `storageConfig` or `persistence`.
 */
const initialOnlyKey = function initialOnlyKey(
	options: ConsentRuntimeUpdate
): string {
	const { persistence, prefetch } = options;
	return JSON.stringify([
		options.mode?.kind,
		options.i18n,
		// The server's experiment wins over the configured one.
		(isPromiseLike(prefetch) ? undefined : prefetch)?.experiment ??
			options.experiment,
		options.storageConfig,
		typeof persistence === 'object'
			? [persistence.skipHydration, persistence.storageConfig, persistence.sync]
			: persistence !== false,
	]);
};

/**
 * Build a slot's module again with changed options, or mount it when no
 * runtime has. `null` unmounts it. A module the runtime did not mount is
 * torn down with the runtime's modules.
 */
const replace = function replace<
	Options,
	Handle extends { dispose: () => void },
>(
	target: BuiltProviderRuntime,
	slot: ModuleSlot<Options, Handle>,
	changes: Partial<NoInfer<Options>> | null,
	initialOptions: () => NoInfer<Options>
): void {
	const mountedByRuntime = slot.last !== null && slot.inner !== null;
	slot.inner?.dispose();
	slot.inner = null;
	if (!changes) {
		return;
	}
	const options = { ...(slot.last ?? initialOptions()), ...changes };
	slot.last = options;
	slot.inner = slot.factory(options);
	if (!mountedByRuntime) {
		target.track(slot.standIn.dispose);
	}
};

/** Re-declare vendors after the vendors, scripts or rules changed. */
const redeclareVendors = function redeclareVendors(
	host: ProviderUpdateHost,
	current: ConsentRuntimeUpdate
): void {
	const {
		declareOwnedVendors,
		extractConsentNamesFromCondition,
		resolveVendors,
	} = host.tools;
	const { kernel } = host.main.runtime;
	const owners = ownersOf(current);
	// Resolved against the backend entries the kernel already holds, so
	// a script that starts naming a backend vendor's slug attaches to
	// that entry as an owner and survives the backend dropping it.
	const declared = resolveVendors({
		config: current.vendors,
		existing: (kernel.getSnapshot().vendors?.declared ?? []).flatMap(
			(vendor) => {
				// A backend copy a config entry shadows counts too:
				// replacing the config source restores it.
				const manifest =
					vendor.source === 'manifest' ? vendor : vendor.shadowed;
				if (manifest?.source !== 'manifest') {
					return [];
				}
				const {
					ownerCategory: _stale,
					ownerDetails: _staleDetails,
					...rest
				} = manifest;
				return [rest];
			}
		),
		onWarn: warnInDevelopment,
	});
	// The provider owns the config source outright: a vendor the host
	// removed disappears, and a backend entry a config copy shadowed
	// comes back. Its owners are then declared under its own token.
	kernel.set.vendors({ declared }, { replaceSource: 'config' });
	declareOwnedVendors(kernel, owners, host.ownerSource);
	kernel.set.registerConsentCategories(
		[...declared, ...owners].flatMap((declaration) =>
			extractConsentNamesFromCondition(declaration.category)
		)
	);
};

/** Bring a started runtime's modules up to the new options. */
// oxlint-disable-next-line complexity -- One comparison per live module option.
const syncModules = function syncModules(
	host: ProviderUpdateHost,
	previous: ConsentRuntimeUpdate,
	current: ConsentRuntimeUpdate
): void {
	const { afterModuleLoaded, holdNetworkRequests, notHeld } = host.tools;
	const target = host.active();
	const { enabled } = host;
	const { kernel } = target.runtime;
	if (current.scripts !== previous.scripts) {
		const loader: ScriptLoaderHandle | null = target.scripts.inner;
		if (loader) {
			loader.updateScripts(current.scripts ?? []);
		} else if (current.scripts?.length) {
			replace(target, target.scripts, { scripts: current.scripts }, () => ({
				kernel,
				nonce: current.nonce,
				onDebug: current.scriptLoader?.onDebug,
				scripts: [],
			}));
			// Data clearing subscribes after the loader, so revocation
			// callbacks finish before browser data is removed. A loader
			// that loads on demand subscribes when its chunk lands.
			afterModuleLoaded(target.scripts.inner, () => {
				if (target.cleanup.inner) {
					replace(target, target.cleanup, {}, () => ({
						config: host.initial.clearOnRevocation ?? {},
						kernel,
					}));
				}
			});
		}
	}
	if (!enabled) {
		// Only the script loader runs while disabled.
		return;
	}
	const before = previous.networkBlocker || undefined;
	const after = current.networkBlocker || undefined;
	const blocker: NetworkBlockerHandle | null = target.network.inner;
	const noRules = () => ({ hold: notHeld, kernel, rules: [] });
	if (after && blocker) {
		// Compared resolved: `{ rules }` alone means on.
		const on = after.enabled !== false;
		const wasOn = before?.enabled !== false;
		if (on !== wasOn) {
			blocker.setEnabled(on);
		}
		if (after.rules !== before?.rules || (on && !wasOn)) {
			// A blocker that loads on demand applies the rules once its chunk
			// lands: hold what they match until then. One that has loaded
			// takes the hold over at once.
			const hold = on ? holdNetworkRequests(after.rules) : notHeld;
			blocker.updateRules(after.rules, hold);
			// A blocker whose chunk failed to load does not take it over until
			// a later load does: fail it closed without leaving requests
			// pending. A no-op once it took over.
			afterModuleLoaded(blocker, hold.fail);
			// Never taken over: fail what it held closed.
			target.track(() => hold.block());
		}
	} else if (after) {
		// Hold matching requests until the blocker, possibly lazy, lands.
		const hold =
			after.enabled === false ? notHeld : holdNetworkRequests(after.rules);
		replace(target, target.network, { ...after, hold }, noRules);
		// A blocker whose chunk failed to load never takes the hold over:
		// fail it closed without leaving requests pending. A no-op once it
		// did.
		afterModuleLoaded(target.network.inner, hold.fail);
		// A blocker that never loaded never took the hold over: fail
		// what it held closed. A no-op once it did.
		target.track(() => hold.block());
	} else if (blocker) {
		replace(target, target.network, null, noRules);
	}
	const iframeOn = current.iframeBlocker !== false;
	if (
		iframeOn !== Boolean(target.iframes.inner) ||
		(current.iframeBlocker || undefined)?.disableAutomaticBlocking !==
			(previous.iframeBlocker || undefined)?.disableAutomaticBlocking
	) {
		replace(
			target,
			target.iframes,
			iframeOn
				? {
						disableAutomaticBlocking: (current.iframeBlocker || undefined)
							?.disableAutomaticBlocking,
					}
				: null,
			() => ({ kernel })
		);
	}
};

/**
 * Apply what changed between two option sets.
 *
 * @param host - The provider runtime's parts.
 * @param previous - The options last applied.
 * @param current - The options to apply.
 * @param withModules - Whether to bring mounted modules up to `current`;
 * `false` before `start()`.
 * @internal
 */
export const applyProviderUpdate = function applyProviderUpdate(
	host: ProviderUpdateHost,
	previous: ConsentRuntimeUpdate,
	current: ConsentRuntimeUpdate,
	withModules: boolean
): void {
	const { tools } = host;
	const { normalizeKernelUser } = tools;
	if (
		!isProductionBuild() &&
		initialOnlyKey(current) !== initialOnlyKey(previous)
	) {
		console.warn(
			'c15t: `mode`, `i18n`, `experiment`, `persistence` and `storageConfig` are read once. Create a new runtime (remount the provider) to change them.'
		);
	}
	const user = normalizeKernelUser(current.user);
	if (userKey(user) !== userKey(normalizeKernelUser(previous.user))) {
		void host.main.runtime.identify(user);
	}
	if (vendorsKey(current) !== vendorsKey(previous)) {
		redeclareVendors(host, current);
	}
	if (withModules) {
		syncModules(host, previous, current);
	}
};
