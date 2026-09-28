/**
 * Reload the page after a visitor revokes a permission.
 *
 * Unmounting a script cannot undo code that already ran: listeners, timers,
 * history hooks and widgets stay alive until the page unloads. When an
 * explicit accept, reject or save turns off a category or vendor that was
 * effectively granted, the page reloads once every in-flight save settles,
 * so the next document starts with only the permitted code.
 *
 * Expiry, policy changes and privacy signals do not reload: they change
 * permissions without a visitor action. An external consent source owns its
 * own decisions, so any withdrawal it reports reloads the same way.
 */
import type {
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	Unsubscribe,
} from '../types';
import { evaluateConsent } from './has';

/** Options for {@link watchRevocationReload}. */
export interface RevocationReloadOptions {
	/** Kernel whose save commands are watched. */
	kernel: ConsentKernel;
	/**
	 * Read when a reload is due. Return `false` to skip it.
	 * @default () => true
	 */
	isEnabled?: () => boolean;
	/** Called synchronously before the reload. Read when a reload is due. */
	getOnBeforeReload?: () =>
		| ((payload: { preferences: ConsentState }) => void)
		| undefined;
	/**
	 * Performs the reload.
	 * @default () => window.location.reload()
	 */
	reload?: () => void;
}

const reloadWindow = function reloadWindow(): void {
	window.location.reload();
};

const hasRevokedCategory = function hasRevokedCategory(
	before: Readonly<ConsentState>,
	after: Readonly<ConsentState>
): boolean {
	for (const [category, granted] of Object.entries(before)) {
		if (
			category !== 'necessary' &&
			granted &&
			after[category as keyof ConsentState] === false
		) {
			return true;
		}
	}
	return false;
};

/**
 * Whether a permission that was effectively granted before an action is
 * denied after it. Covers categories and, outside IAB, vendor switches.
 * @param before - Snapshot when the save started.
 * @param after - Snapshot the save recorded.
 * @returns `true` when code allowed to run before is no longer allowed.
 */
export const hasRevokedPermission = function hasRevokedPermission(
	before: ConsentSnapshot,
	after: ConsentSnapshot
): boolean {
	if (
		hasRevokedCategory(before.effectivePermissions, after.effectivePermissions)
	) {
		return true;
	}
	if (after.model === 'iab' || after.vendorChoice === before.vendorChoice) {
		return false;
	}
	const now = Date.now();
	for (const vendor of after.vendors?.declared ?? []) {
		const target = { category: vendor.category, vendor: vendor.id };
		try {
			if (
				evaluateConsent(target, before, now) &&
				!evaluateConsent(target, after, now)
			) {
				return true;
			}
		} catch {
			// An unknown category cannot have been granted before.
		}
	}
	return false;
};

/**
 * Reloads the page after an explicit action or an external consent source
 * revokes a granted permission.
 *
 * The reload waits for every in-flight save to complete so the backend
 * request is not cancelled, and runs in a later macrotask so stored records
 * and synchronous consent callbacks finish first.
 * Framework adapters call this; applications set `reloadOnConsentRevoked`.
 * @param options - Kernel, enablement and callback accessors.
 * @returns A disposer that stops watching and cancels a pending reload.
 * @internal
 */
export const watchRevocationReload = function watchRevocationReload({
	kernel,
	isEnabled = () => true,
	getOnBeforeReload,
	reload = reloadWindow,
}: RevocationReloadOptions): Unsubscribe {
	let savesInFlight = 0;
	let saveStartSnapshot: ConsentSnapshot | null = null;
	let revoked = false;
	let timer: ReturnType<typeof setTimeout> | null = null;

	// A save runs synchronously from `started` to its recorded events, so
	// the latest start snapshot is always the recording save's baseline.
	const onRecorded = ({ snapshot }: { snapshot: ConsentSnapshot }) => {
		if (
			saveStartSnapshot &&
			hasRevokedPermission(saveStartSnapshot, snapshot)
		) {
			revoked = true;
		}
	};

	const scheduleReload = () => {
		if (savesInFlight > 0 || !revoked || timer !== null) {
			return;
		}
		if (typeof window === 'undefined' || !isEnabled()) {
			revoked = false;
			return;
		}
		timer = setTimeout(() => {
			timer = null;
			const preferences = kernel.getSnapshot().effectivePermissions;
			revoked = false;
			getOnBeforeReload?.()?.({ preferences: { ...preferences } });
			reload();
		}, 0);
	};

	const subscriptions = [
		kernel.events.on('command:save:started', () => {
			savesInFlight += 1;
			saveStartSnapshot = kernel.getSnapshot();
		}),
		kernel.events.on('choice:recorded', onRecorded),
		kernel.events.on('vendors:recorded', onRecorded),
		kernel.events.on('command:save:completed', () => {
			savesInFlight = Math.max(0, savesInFlight - 1);
			scheduleReload();
		}),
		// An external source has no save commands; its reported decision is
		// the visitor action.
		kernel.events.on('permissions:changed', ({ previous, snapshot }) => {
			if (
				snapshot.externalPermissions &&
				hasRevokedCategory(previous, snapshot.effectivePermissions)
			) {
				revoked = true;
				scheduleReload();
			}
		}),
	];

	return () => {
		for (const unsubscribe of subscriptions) {
			unsubscribe();
		}
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
	};
};
