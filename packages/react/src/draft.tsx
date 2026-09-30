'use client';

import type {
	AllConsentNames,
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	SaveResult,
	SaveInput,
	SaveUISource,
} from '@c15t/core';
import { deniedVendorIds, vendorRenders } from '@c15t/core';
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from 'react';
import type { ReactNode } from 'react';

import { KernelContext, ProviderServicesContext } from './context';
import { useCommittedRef } from './hooks/use-committed-ref';
import { useUIConfig } from './ui-config-context';
import { saveConsentUI } from './ui-save';

/** A local, unmasked selection, committed only by an explicit save. */
export interface ConsentDraftHandle {
	values: Readonly<ConsentState>;
	displayedCategories: readonly AllConsentNames[];
	/**
	 * Granted flag per declared vendor. Seeded from the denials the gate
	 * honors, so a vendor declared `disabled` reads `true` whatever an older
	 * record says; every vendor not denied is `true`. Empty under an `iab`
	 * policy.
	 */
	vendors: Readonly<Record<string, boolean>>;
	isDirty: boolean;
	/** A policy or displayed-category change requires reset and review before saving. */
	isStale: boolean;
	set: (category: AllConsentNames, value: boolean) => void;
	update: (patch: Partial<ConsentState>) => void;
	/**
	 * Stage one vendor's grant. Recorded by the next save. Ignored for a
	 * vendor that is not declared or is declared `disabled`, since the kernel
	 * would drop the grant on save.
	 */
	setVendor: (vendorId: string, granted: boolean) => void;
	acceptAll: () => void;
	rejectAll: () => void;
	save: () => Promise<SaveResult>;
	reset: () => void;
}
interface DraftSnapshot {
	values: ConsentState;
	displayedCategories: readonly AllConsentNames[];
	vendors: Record<string, boolean>;
	isDirty: boolean;
	isStale: boolean;
}
/**
 * Defines an own enumerable data property. Plain assignment would route a
 * valid `__proto__` vendor id through the prototype setter and drop it, so
 * that vendor could never become dirty or travel with a save.
 */
const setOwn = function setOwn(
	target: Record<string, boolean>,
	key: string,
	value: boolean
): void {
	Object.defineProperty(target, key, {
		configurable: true,
		enumerable: true,
		value,
		writable: true,
	});
};
const seedVendors = function seedVendors(
	snapshot: ConsentSnapshot
): Record<string, boolean> {
	const grants: Record<string, boolean> = {};
	if (snapshot.model === 'iab') {
		return grants;
	}
	// The kernel's own gate view: a stale denial for a vendor now declared
	// `disabled` does not count, so the draft never reports a vendor as off
	// while every gate allows it.
	const denied = deniedVendorIds(snapshot) ?? new Set<string>();
	for (const vendor of snapshot.vendors?.declared ?? []) {
		setOwn(grants, vendor.id, !denied.has(vendor.id));
	}
	return grants;
};
/**
 * What the preference surface shows for each vendor: whether it has a row
 * at all, and which categories host it. A staged edit is made against a
 * row, so a vendor losing its row, or moving to another category, is as
 * material as one appearing or disappearing.
 */
const vendorSurface = function vendorSurface(
	snapshot: ConsentSnapshot
): string {
	if (snapshot.model === 'iab') {
		return '';
	}
	// A declaration that cannot produce a row, such as a script registering
	// only its slug, is not part of the surface: it changes nothing visible.
	return JSON.stringify(
		(snapshot.vendors?.declared ?? [])
			.filter(vendorRenders)
			.map((vendor) => [vendor.id, vendor.disabled === true, vendor.category])
			.sort(([left], [right]) => String(left).localeCompare(String(right)))
	);
};
/** Ids a save may toggle: declared and not `disabled`, mirroring the kernel. */
const toggleableVendorIds = function toggleableVendorIds(
	snapshot: ConsentSnapshot
): ReadonlySet<string> {
	const ids = new Set<string>();
	if (snapshot.model === 'iab') {
		return ids;
	}
	for (const vendor of snapshot.vendors?.declared ?? []) {
		if (vendor.disabled !== true) {
			ids.add(vendor.id);
		}
	}
	return ids;
};
const sameGrants = function sameGrants(
	left: Readonly<Record<string, boolean>>,
	right: Readonly<Record<string, boolean>>
): boolean {
	const keys = Object.keys(left);
	return (
		keys.length === Object.keys(right).length &&
		keys.every((key) => left[key] === right[key])
	);
};
const seed = function seed(
	snapshot: ConsentSnapshot,
	defaults?: Partial<ConsentState>
): ConsentState {
	const values: ConsentState = {
		experience: false,
		functionality: false,
		marketing: false,
		measurement: false,
		necessary: true,
	};
	for (const category of snapshot.evaluationPolicy.choiceScope ??
		snapshot.policyRule.scope) {
		values[category] =
			snapshot.explicitChoice?.categories[category]?.value ??
			defaults?.[category] ??
			(snapshot.policyRule.model === 'opt-out' ||
				snapshot.policyRule.preselectedCategories.includes(category));
	}
	return values;
};
const createDraftStore = function createDraftStore(
	kernel: ConsentKernel,
	defaults?: Partial<ConsentState>
) {
	let revision = 0;
	let saveSequence = 0;
	let source = kernel.getSnapshot();
	let base = seed(source, defaults);
	let baseVendors = seedVendors(source);
	let toggleable = toggleableVendorIds(source);
	let surface = vendorSurface(source);
	let { fingerprint } = source.evaluationPolicy.choice;
	let current: DraftSnapshot = {
		displayedCategories: [
			'necessary',
			...(source.evaluationPolicy.choiceScope ?? source.policyRule.scope),
		],
		isDirty: false,
		isStale: false,
		values: base,
		vendors: baseVendors,
	};
	const listeners = new Set<() => void>();
	const publish = (next: DraftSnapshot) => {
		current = next;
		for (const listener of listeners) {
			listener();
		}
	};
	const isDirty = (
		values: ConsentState,
		vendors: Readonly<Record<string, boolean>>
	) =>
		current.displayedCategories.some(
			(category) => values[category] !== base[category]
		) || !sameGrants(vendors, baseVendors);
	const reset = () => {
		revision += 1;
		source = kernel.getSnapshot();
		base = seed(source, defaults);
		baseVendors = seedVendors(source);
		toggleable = toggleableVendorIds(source);
		surface = vendorSurface(source);
		({ fingerprint } = source.evaluationPolicy.choice);
		publish({
			displayedCategories: [
				'necessary',
				...(source.evaluationPolicy.choiceScope ?? source.policyRule.scope),
			],
			isDirty: false,
			isStale: false,
			values: base,
			vendors: baseVendors,
		});
	};
	const update = (patch: Partial<ConsentState>) => {
		const values = { ...current.values };
		let changed = false;
		for (const category of current.displayedCategories) {
			if (
				category !== 'necessary' &&
				typeof patch[category] === 'boolean' &&
				values[category] !== patch[category]
			) {
				values[category] = patch[category];
				changed = true;
			}
		}
		if (changed) {
			revision += 1;
			publish({
				...current,
				isDirty: isDirty(values, current.vendors),
				values,
			});
		}
	};
	const updateVendors = (patch: Readonly<Record<string, boolean>>) => {
		const vendors = { ...current.vendors };
		let changed = false;
		for (const [id, granted] of Object.entries(patch)) {
			// A `disabled` vendor is listed but not toggleable: the kernel drops
			// a grant for it on save, so staging one would only dirty the draft.
			if (
				toggleable.has(id) &&
				typeof granted === 'boolean' &&
				vendors[id] !== granted
			) {
				setOwn(vendors, id, granted);
				changed = true;
			}
		}
		if (changed) {
			revision += 1;
			publish({
				...current,
				isDirty: isDirty(current.values, vendors),
				vendors,
			});
		}
	};
	/** Every declared vendor granted: what a bulk action leaves behind. */
	const allVendorsOn = () => {
		const grants: Record<string, boolean> = {};
		for (const id of Object.keys(baseVendors)) {
			setOwn(grants, id, true);
		}
		return grants;
	};
	const sync = () => {
		const next = kernel.getSnapshot();
		if (
			source.explicitChoice === next.explicitChoice &&
			source.policyRule === next.policyRule &&
			source.evaluationPolicy === next.evaluationPolicy &&
			source.vendors === next.vendors &&
			source.vendorChoice === next.vendorChoice &&
			source.model === next.model
		) {
			return;
		}
		const nextScope =
			next.evaluationPolicy.choiceScope ?? next.policyRule.scope;
		const scopeChanged =
			current.displayedCategories.length !== nextScope.length + 1 ||
			nextScope.some(
				(category) => !current.displayedCategories.includes(category)
			);
		// A changed vendor surface is material too: the draft's vendor grants
		// are staged against rows, so a vendor appearing, disappearing, losing
		// its row while a script keeps its slug, moving category, or flipping
		// between `disabled` and toggleable needs a reset. A recorded grant
		// change is what a save produces and reseeds through the clean-draft
		// path below.
		const vendorsChanged = vendorSurface(next) !== surface;
		const material =
			fingerprint !== next.evaluationPolicy.choice.fingerprint ||
			scopeChanged ||
			vendorsChanged;
		source = next;
		if (!current.isDirty) {
			reset();
		} else if (material && !current.isStale) {
			publish({ ...current, isStale: true });
		}
	};
	return {
		acceptAll() {
			update(
				Object.fromEntries(
					current.displayedCategories.map((category) => [category, true])
				)
			);
			updateVendors(allVendorsOn());
		},
		connect() {
			sync();
			return kernel.subscribe(sync);
		},
		getSnapshot: () => current,
		/** The kernel this draft reads from and saves into. */
		kernel,
		rejectAll() {
			update(
				Object.fromEntries(
					current.displayedCategories.map((category) => [category, false])
				)
			);
			// Vendors follow the category: a rejected category needs no per-vendor
			// denial, and the kernel clears the denial list on a bulk action.
			updateVendors(allVendorsOn());
		},
		reset,
		async save(
			input?: SaveInput,
			categories?: readonly AllConsentNames[],
			onSuccess?: () => void,
			uiSource?: SaveUISource
		): Promise<SaveResult> {
			// Guard against changes between the render and the click as well.
			if (
				fingerprint !==
					kernel.getSnapshot().evaluationPolicy.choice.fingerprint ||
				current.isStale
			) {
				publish({ ...current, isStale: true });
				return { ok: false };
			}
			const patch: Partial<ConsentState> = {};
			const selection = new Set(categories ?? current.displayedCategories);
			for (const category of current.displayedCategories) {
				if (category !== 'necessary' && selection.has(category)) {
					patch[category] = current.values[category];
				}
			}
			saveSequence += 1;
			const sequence = saveSequence;
			// Only vendors the draft moved travel with the save, so an untouched
			// vendor never renews the recorded confirmation time. A bulk action
			// clears the denial list on its own, so it carries none.
			const bulk = input === 'all' || input === 'none';
			const vendors: Record<string, boolean> = {};
			if (!bulk) {
				for (const [id, granted] of Object.entries(current.vendors)) {
					if (baseVendors[id] !== granted) {
						setOwn(vendors, id, granted);
					}
				}
			}
			const pending = kernel.commands.save(input ?? patch, {
				categories,
				...(Object.keys(vendors).length > 0 && { vendors }),
				...(uiSource !== undefined && { uiSource }),
			});
			// A clean draft can reseed synchronously from the local receipt.
			const savedRevision = revision;
			const result = await pending;
			if (
				result.ok &&
				sequence === saveSequence &&
				revision === savedRevision &&
				!current.isStale &&
				fingerprint === kernel.getSnapshot().evaluationPolicy.choice.fingerprint
			) {
				reset();
				onSuccess?.();
			}
			return result;
		},
		set(category: AllConsentNames, value: boolean) {
			update({ [category]: value });
		},
		setVendor(vendorId: string, granted: boolean) {
			updateVendors({ [vendorId]: granted });
		},
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		update,
	};
};
type DraftStore = ReturnType<typeof createDraftStore>;
const DraftContext = createContext<DraftStore | null>(null);
const useKernel = function useKernel() {
	const kernel = useContext(KernelContext);
	if (!kernel) {
		throw new Error('Consent drafts require a ConsentProvider.');
	}
	return kernel;
};
/**
 * A draft store bound to the kernel in context. A provider handed a new
 * runtime changes that kernel without remounting its children, so the store
 * is rebuilt for the new kernel and the previous draft is dropped rather than
 * carried over, where its save would record into the old runtime.
 */
const useKernelDraftStore = function useKernelDraftStore(
	kernel: ConsentKernel,
	defaults: Partial<ConsentState> | undefined
): DraftStore {
	const [entry, setEntry] = useState(() => ({
		kernel,
		store: createDraftStore(kernel, defaults),
	}));
	if (entry.kernel === kernel) {
		return entry.store;
	}
	// Adjusting state during render: React re-renders this component before
	// committing, so no child ever sees the store of the previous kernel.
	const next = { kernel, store: createDraftStore(kernel, defaults) };
	setEntry(next);
	return next.store;
};
export interface ConsentDraftProviderProps {
	children: ReactNode;
	/** Defaults apply only to categories without an explicit receipt. */
	initial?: Partial<ConsentState>;
}
export const ConsentDraftProvider = ({
	children,
	initial,
}: ConsentDraftProviderProps) => {
	const kernel = useKernel();
	const parent = useContext(DraftContext);
	const { presentation } = useUIConfig();
	const local = useKernelDraftStore(
		kernel,
		initial ?? presentation?.preferences?.defaults
	);
	// Inherit an outer draft only while it belongs to this kernel. A nested
	// provider on another runtime must not save into the outer one.
	const store = parent && !initial && parent.kernel === kernel ? parent : local;
	useEffect(() => store.connect(), [store]);
	return (
		<DraftContext.Provider value={store}>{children}</DraftContext.Provider>
	);
};
const useDraftStore = function useDraftStore() {
	const kernel = useKernel();
	const shared = useContext(DraftContext);
	const { presentation } = useUIConfig();
	const local = useKernelDraftStore(
		kernel,
		presentation?.preferences?.defaults
	);
	// A shared draft bound to another kernel belongs to an outer provider.
	const store = shared?.kernel === kernel ? shared : local;
	useEffect(
		() => (store === shared ? undefined : store.connect()),
		[shared, store]
	);
	return store;
};

/**
 * Whether `store` still belongs to the kernel this component last committed.
 *
 * A handle or save action kept across a runtime switch, by an async submit or
 * a descendant's layout effect in the switch commit, calls through this. Its
 * store stays bound to the previous kernel, either because a new store
 * replaced it or because it is an outer draft the outer provider still uses,
 * so the check fails and the call records nothing. The committed kernel is
 * read at call time (see `useCommittedRef`), so the check holds from the
 * moment the switch commits. A component that only unmounts keeps its last
 * kernel, so a submit that outlives its dialog still saves on that runtime.
 */
const useDraftGuard = function useDraftGuard(store: DraftStore): () => boolean {
	const committedKernelRef = useCommittedRef(useKernel());
	return useCallback(
		() => committedKernelRef.current === store.kernel,
		[committedKernelRef, store]
	);
};

const REFUSED: SaveResult = { ok: false };

const useSaveAction = function useSaveAction(store: DraftStore) {
	const kernel = useKernel();
	const services = useContext(ProviderServicesContext);
	const isCurrent = useDraftGuard(store);
	return useCallback(
		(input?: SaveInput, uiSource?: SaveUISource) => {
			// Refuse before touching the previous runtime's UI state.
			if (!isCurrent()) {
				return Promise.resolve(REFUSED);
			}
			let current = false;
			return saveConsentUI(
				kernel,
				() =>
					store.save(
						input,
						services?.getConsentCategories(),
						() => {
							current = true;
						},
						uiSource
					),
				() => current
			);
		},
		[isCurrent, kernel, store, services]
	);
};

const useDraftHandle = function useDraftHandle(
	store: DraftStore
): ConsentDraftHandle {
	const snapshot = useSyncExternalStore(
		store.subscribe,
		store.getSnapshot,
		store.getSnapshot
	);
	const isCurrent = useDraftGuard(store);
	return useMemo(() => {
		// A handle bound to another kernel is inert: staging would edit a
		// draft this component no longer shows, and saving would record into
		// the previous runtime.
		const guarded =
			<Args extends unknown[]>(method: (...args: Args) => void) =>
			(...args: Args) => {
				if (isCurrent()) {
					method(...args);
				}
			};
		return {
			...snapshot,
			acceptAll: guarded(store.acceptAll),
			rejectAll: guarded(store.rejectAll),
			reset: guarded(store.reset),
			save: (...args: Parameters<DraftStore['save']>) =>
				isCurrent() ? store.save(...args) : Promise.resolve(REFUSED),
			set: guarded(store.set),
			setVendor: guarded(store.setVendor),
			update: guarded(store.update),
		};
	}, [isCurrent, snapshot, store]);
};

/** Internal UI save path shared by stock controls and headless actions. */
export const useConsentSaveAction = function useConsentSaveAction() {
	return useSaveAction(useDraftStore());
};

/**
 * The nearest consent draft store, for the stock preference rows. Pair with
 * {@link useConsentDraftSlice} so a row re-renders only when its own slice
 * changes, not on every staged edit elsewhere in the draft.
 *
 * @returns The shared draft store, or a local one outside a provider.
 * @internal
 */
export const useConsentDraftStore =
	function useConsentDraftStore(): DraftStore {
		return useDraftStore();
	};

/**
 * Subscribes to one slice of a consent draft store.
 *
 * @param store - Store from {@link useConsentDraftStore}.
 * @param selector - Picks the slice. Return a primitive or a reference the
 * draft already holds.
 * @returns The selected slice.
 * @internal
 */
export const useConsentDraftSlice = function useConsentDraftSlice<SliceType>(
	store: DraftStore,
	selector: (draft: DraftSnapshot) => SliceType
): SliceType {
	const read = () => selector(store.getSnapshot());
	return useSyncExternalStore(store.subscribe, read, read);
};

/** Read and edit displayed choices without replacing masked effective permissions. */
export const useConsentDraft = function useConsentDraft(): ConsentDraftHandle {
	return useDraftHandle(useDraftStore());
};

/** The vendor slice of the consent draft, for a custom vendor control. */
export interface VendorDraftHandle {
	/** Granted flag per declared vendor. See {@link ConsentDraftHandle.vendors}. */
	vendors: Readonly<Record<string, boolean>>;
	/** Stage one vendor's grant for the next save. See {@link ConsentDraftHandle.setVendor}. */
	setVendor: (vendorId: string, granted: boolean) => void;
	/** Whether any draft value, category or vendor, differs from the record. */
	isDirty: boolean;
	/**
	 * Whether the policy or the vendor surface changed under an unsaved edit.
	 * `save` refuses a stale draft. See {@link ConsentDraftHandle.isStale}.
	 */
	isStale: boolean;
	/** Confirm the draft, categories and vendors together. */
	save: () => Promise<SaveResult>;
	/** Discard staged edits and reseed from the record. See {@link ConsentDraftHandle.reset}. */
	reset: () => void;
}

/**
 * Read and stage vendor grants on the same draft the category switches use.
 * A custom vendor toggle needs only this; the categories stay where the
 * stock widget or `useConsentDraft()` left them, and one save confirms both.
 * When the policy or the vendor list changes under a staged edit the draft
 * turns stale and `save` refuses it; `reset` reseeds it from the record.
 *
 * @returns The draft's vendor map, the setter, the dirty and stale flags,
 * the save and the reset.
 * @example
 * ```tsx
 * const { vendors, setVendor, isStale, reset, save } = useVendorDraft();
 * <Switch
 *   checked={vendors['meta-pixel'] ?? true}
 *   onCheckedChange={(on) => setVendor('meta-pixel', on)}
 * />;
 * {isStale && <button onClick={reset}>Review again</button>}
 * ```
 * @public
 */
export const useVendorDraft = function useVendorDraft(): VendorDraftHandle {
	const { isDirty, isStale, reset, save, setVendor, vendors } =
		useDraftHandle(useDraftStore());
	return useMemo(
		() => ({ isDirty, isStale, reset, save, setVendor, vendors }),
		[isDirty, isStale, reset, save, setVendor, vendors]
	);
};
