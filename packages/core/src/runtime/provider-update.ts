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
import type { hostExperiment } from '../libs/experiment';
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
import type { storageFor } from './assemble';
import type { afterModuleLoaded } from './lazy-module';
import type { Replaceable } from './provider-runtime';
import type { normalizeKernelUser } from './runtime-kernel';
import type { ConsentRuntime, ConsentRuntimeUpdate } from './types';

/** One of the provider's runtimes and its replaceable modules. */
export interface BuiltProviderRuntime {
	runtime: ConsentRuntime;
	scripts: Replaceable<ScriptLoaderOptions, ScriptLoaderHandle>;
	network: Replaceable<NetworkBlockerOptions, NetworkBlockerHandle>;
	iframes: Replaceable<IframeBlockerOptions, IframeBlockerHandle>;
	cleanup: Replaceable<ClearOnRevocationOptions, ClearOnRevocationHandle>;
	/** Tear `dispose` down with this runtime's modules. */
	track: (dispose: () => void) => void;
}

/** The first-load functions the update calls. */
export interface ProviderUpdateTools {
	afterModuleLoaded: typeof afterModuleLoaded;
	declareOwnedVendors: typeof declareOwnedVendors;
	extractConsentNamesFromCondition: typeof extractConsentNamesFromCondition;
	holdNetworkRequests: typeof holdNetworkRequests;
	hostExperiment: typeof hostExperiment;
	normalizeKernelUser: typeof normalizeKernelUser;
	notHeld: NetworkHold;
	resolveVendors: typeof resolveVendors;
	storageFor: typeof storageFor;
}

/** What the update needs from the provider runtime. */
export interface ProviderUpdateHost {
	/** The runtime rendered now: the permissive one while disabled. */
	active: () => BuiltProviderRuntime;
	readonly enabled: boolean;
	/** The runtime holding the records and policy. */
	main: BuiltProviderRuntime;
	/** The provider's token among the owners of its vendor slugs. */
	ownerSource: symbol;
	tools: ProviderUpdateTools;
}

const isProduction = function isProduction(): boolean {
	return (
		(globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
			?.NODE_ENV === 'production'
	);
};

const warnInDevelopment = function warnInDevelopment(message: string): void {
	if (!isProduction()) {
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
 * What the read-once options a warning compares come to. Storage is among
 * them: persistence reads and writes one location for the runtime's life,
 * and data clearing protects that same location, so neither follows a new
 * `storageConfig` or `persistence`.
 */
const initialOnlyKey = function initialOnlyKey(
	tools: ProviderUpdateTools,
	options: ConsentRuntimeUpdate
): string {
	const { hostExperiment, storageFor } = tools;
	const { persistence } = options;
	return JSON.stringify([
		options.mode?.kind,
		options.i18n,
		hostExperiment(
			options.experiment,
			isPromiseLike(options.prefetch) ? undefined : options.prefetch
		),
		storageFor(options),
		typeof persistence === 'object'
			? [persistence.skipHydration, persistence.sync]
			: persistence !== false,
	]);
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
				const { ownerCategory: _stale, ...rest } = manifest;
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
	if (current.scripts !== previous.scripts) {
		const loader: ScriptLoaderHandle | null = target.scripts.current();
		if (loader) {
			loader.updateScripts(current.scripts ?? []);
		} else if (current.scripts?.length) {
			target.scripts.replace({ scripts: current.scripts });
			// Data clearing subscribes after the loader, so revocation
			// callbacks finish before browser data is removed. A loader
			// that loads on demand subscribes when its chunk lands.
			afterModuleLoaded(target.scripts.current(), () => {
				if (target.cleanup.current()) {
					target.cleanup.replace({});
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
	const blocker: NetworkBlockerHandle | null = target.network.current();
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
			// Never taken over: fail what it held closed.
			target.track(() => hold.block());
		}
	} else if (after) {
		// Hold matching requests until the blocker, possibly lazy, lands.
		const hold =
			after.enabled === false ? notHeld : holdNetworkRequests(after.rules);
		target.network.replace({ ...after, hold });
		// A blocker that never loaded never took the hold over: fail
		// what it held closed. A no-op once it did.
		target.track(() => hold.block());
	} else if (blocker) {
		target.network.replace(null);
	}
	const iframeOn = current.iframeBlocker !== false;
	if (
		iframeOn !== Boolean(target.iframes.current()) ||
		(current.iframeBlocker || undefined)?.disableAutomaticBlocking !==
			(previous.iframeBlocker || undefined)?.disableAutomaticBlocking
	) {
		target.iframes.replace(
			iframeOn
				? {
						disableAutomaticBlocking: (current.iframeBlocker || undefined)
							?.disableAutomaticBlocking,
					}
				: null
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
		!isProduction() &&
		initialOnlyKey(tools, current) !== initialOnlyKey(tools, previous)
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
